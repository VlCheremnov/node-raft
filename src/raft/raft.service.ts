import { Injectable, OnModuleInit } from '@nestjs/common'

import { AppendEntriesResult, RequestVoteResult, ServerConfig } from './types'

import { State } from './enum'
import { ConfigService } from '@nestjs/config'
import { RequestVoteDto } from './dto/request-vote.dto'
import { AppendEntriesDto, LogEntryDto } from './dto/append-entries.dto'

@Injectable()
export class RaftService implements OnModuleInit {
  /** Параметры узла */
  /* Текущее состояние узла */
  private state: State = State.Follower
  /* Текущий срок (увеличивается на стадии кандидата или при выборе нового лидера) */
  private currentTerm: number = 0
  /* Упорядоченный список записей */
  private log: LogEntryDto[] = [{ index: 0, term: 0, command: null }]
  /* Индекс последней зафиксированной записи в логе */
  private commitIndex: number = 0
  /* Индекс последней записи в логе */
  private lastApplied: number = 0

  /** Стадия выбора */
  /* За кого голосует текущий узел */
  private votedFor: number | null = null

  /** Параметры лидера */
  /* Индекс следующей записи лога каждого фоловера */
  private nextIndex: number[]
  /* Индекс последней записи лога каждого фоловера */
  private matchIndex: number[]

  /** key/value хранилище */
  private kvStore: Map<string, string> = new Map()

  /** Таймауты */
  private electionTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null

  /** Конфиги */
  private config: ServerConfig

  constructor(private configService: ConfigService) {
    this.config = {
      servers: this.configService.get<string>('PEERS', '').split(','),
      index: this.configService.get<number>('INDEX', 0),
      heartbeatIntervalMs: this.configService.get<number>(
        'HEARTBEAT_INTERVAL_MS',
        100
      ),
      electionTimeoutMinMs: this.configService.get<number>(
        'ELECTION_TIMEOUT_MIN_MS',
        150
      ),
      electionTimeoutMaxMs: this.configService.get<number>(
        'ELECTION_TIMEOUT_MAX_MS',
        300
      ),
    }

    const serverLength = this.config.servers.length

    this.nextIndex = new Array(serverLength).fill(this.log.length) as number[]
    this.matchIndex = new Array(serverLength).fill(0) as number[]
  }

  onModuleInit() {
    this.resetElectionTimeout()
  }

  /**
   * Останавливает все таймеры
   */
  public stop() {
    this.state = State.Follower

    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout)
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }

  /**
   * Запрашивает голос для выборов лидера
   * @param {RequestVoteDto} params - Параметры запроса голосования
   * @returns {type RequestVoteResult} Результат голосования
   */
  public RequestVote(params: RequestVoteDto): RequestVoteResult {
    if (params.term < this.currentTerm) {
      return { term: this.currentTerm, voteGranted: false }
    }

    if (params.term > this.currentTerm) {
      this.currentTerm = params.term
      this.state = State.Follower
      this.votedFor = null
    }

    const lastLogIndex = this.log.length - 1
    const lastLogTerm = this.log[lastLogIndex].term

    if (
      (this.votedFor === null || this.votedFor === params.candidateId) &&
      (params.lastLogTerm > lastLogTerm ||
        (params.lastLogTerm === lastLogTerm &&
          params.lastLogIndex >= lastLogIndex))
    ) {
      this.votedFor = params.candidateId
      this.resetElectionTimeout()
      return { term: this.currentTerm, voteGranted: true }
    }

    return { term: this.currentTerm, voteGranted: false }
  }

  /**
   * Обработка запроса от лидера
   * @param {AppendEntriesDto} params - Параметры запроса
   * @returns {type AppendEntriesResult}
   * */
  public AppendEntries(params: AppendEntriesDto): AppendEntriesResult {
    if (params.term < this.currentTerm) {
      return { term: this.currentTerm, success: false }
    }

    /* Если в кластере 2 лидера */
    if (this.state === State.Leader) {
      this.stop()
    }

    if (params.term > this.currentTerm) {
      this.currentTerm = params.term
      this.state = State.Follower
      this.votedFor = null
    }

    /* Сбрасываем таймаут выборов */
    this.resetElectionTimeout()

    /* Проверка актуальности */
    if (
      params.prevLogIndex >= this.log.length ||
      this.log[params.prevLogIndex]?.term !== params.prevLogTerm
    ) {
      return { term: this.currentTerm, success: false }
    }

    /* Сохраняем новые данные */
    let index = params.prevLogIndex + 1

    for (const entry of params.entries) {
      if (index < this.log.length && this.log[index].term !== entry.term) {
        this.log.splice(index)
      }

      if (index >= this.log.length) {
        this.log.push(entry)
      }

      index++
    }

    // Обновляем KV
    if (params.leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(params.leaderCommit, this.log.length - 1)
      this.applyLogs()
    }

    return { term: this.currentTerm, success: true }
  }

  /**
   * После истечения таймаута запускаем голосование на переизбрания лидера
   * @returns {Promise void}
   * */
  private async handleElectionTimeout(): Promise<void> {
    if (this.state === State.Leader) return

    this.state = State.Candidate
    this.currentTerm++
    this.votedFor = this.config.index

    const voteGranted = await this.sendRequestVote()

    if (voteGranted) {
      this.becomeLeader()
    } else {
      this.state = State.Follower
      this.resetElectionTimeout()
    }
  }

  /**
   * Запрос для RequestVote и подсчет голосов (HTTP POST к другим нодам)
   * @returns {Promise boolean}
   * */
  private async sendRequestVote(): Promise<boolean> {
    const promises = this.config.servers.map((addr, i) => {
      if (i === this.config.index) return { voteGranted: true } // Сам себе vote

      const params: RequestVoteDto = {
        term: this.currentTerm,
        candidateId: this.config.index,
        lastLogIndex: this.log.length - 1,
        lastLogTerm: this.log[this.log.length - 1].term,
      }

      return fetch(`${addr}/raft/request-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }).then((res) => res.json() as Promise<RequestVoteResult>)
    })

    const results = await Promise.allSettled(promises)

    const votes = results.filter((result) =>
      result.status === 'fulfilled' ? result.value.voteGranted : false
    ).length

    return votes > this.config.servers.length / 2
  }

  /**
   * Избирает текущую ноду лидером и запускает heartbeat
   * @returns {void}
   * */
  private becomeLeader(): void {
    this.state = State.Leader
    this.nextIndex.fill(this.log.length)
    this.matchIndex.fill(0)

    /* Отправляем heartbeat сразу при переизбрании */
    // this.sendHeartbeat()

    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeatIntervalMs
    )
    if (this.electionTimeout) clearTimeout(this.electionTimeout)
  }

  /**
   * Отправляем heartbeat на другие ноды
   * @returns {Promise void}
   * */
  private async sendHeartbeat(): Promise<void> {
    if (this.state !== State.Leader) return

    const promises = this.config.servers.map((addr, i) => {
      if (i === this.config.index) return { success: true }

      const prevLogIndex = this.nextIndex[i] - 1
      const entries = this.log.slice(this.nextIndex[i])

      const params: AppendEntriesDto = {
        term: this.currentTerm,
        leaderId: this.config.index,
        prevLogIndex,
        prevLogTerm:
          prevLogIndex >= 0 && this.log[prevLogIndex]
            ? this.log[prevLogIndex].term
            : 0,
        entries,
        leaderCommit: this.commitIndex,
      }

      return fetch(`${addr}/raft/append-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
        .then((res) => res.json() as Promise<AppendEntriesResult>)
        .then((result) => this.handleHeartbeatResponse(result, i))
        .catch(() => this.handleHeartbeatError())
    })

    await Promise.allSettled(promises)

    this.updateCommitIndex()
  }

  /**
   * Обрабатываем ответ heartbeat от другой ноды
   * @param {AppendEntriesResult} result - Ответ ноды
   * @param {number} index - Индекс ноды, от которой поступил ответ
   * @returns {type AppendEntriesResult}
   * */
  private handleHeartbeatResponse(
    result: AppendEntriesResult,
    index: number
  ): AppendEntriesResult {
    if (result.success) {
      /* Успешный запрос - обновляем индексы ноды */
      this.nextIndex[index] = this.log.length
      this.matchIndex[index] = this.log.length - 1
    } else if (result.term > this.currentTerm) {
      /* Данные лидера не актуальны - откатываем состояние до фоловера и ждем переизбрания */
      this.state = State.Follower
      this.currentTerm = result.term
    } else {
      /* Данные в nextIndex по текущей ноде не актуальны, откатываем и пробуем еще дальше */
      if (this.nextIndex[index] > 0) this.nextIndex[index]--
    }
    return result
  }

  /**
   * Обрабатываем ошибку heartbeat от другой ноды
   * @returns {Object}
   * */
  private handleHeartbeatError(): { success: boolean } {
    return { success: false }
  }

  /**
   * Обновить commitIndex
   * @returns {void}
   * */
  private updateCommitIndex(): void {
    for (
      let logIndex = this.log.length - 1;
      logIndex > this.commitIndex;
      logIndex--
    ) {
      const matches = this.matchIndex.filter((m) => m >= logIndex).length + 1 // +1 для себя

      if (
        matches > this.config.servers.length / 2 &&
        this.log[logIndex].term === this.currentTerm
      ) {
        this.commitIndex = logIndex
        this.applyLogs()
        break
      }
    }
  }

  /**
   * Рандомное число от и до
   * @param {number} min - Минимальное число
   * @param {number} max - Максимальное число
   * @returns {number} Рандомное число
   * */
  getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Сброс таймаута выборов
   * @returns {void}
   * */
  private resetElectionTimeout(): void {
    if (this.electionTimeout) clearTimeout(this.electionTimeout)

    const timeoutMs = this.getRandomNumber(
      this.config.electionTimeoutMinMs,
      this.config.electionTimeoutMaxMs
    )

    this.electionTimeout = setTimeout(
      () => this.handleElectionTimeout(),
      timeoutMs
    )
  }

  /**
   * Применить логи к KV хранилище
   * @returns {void}
   * */
  private applyLogs(): void {
    while (this.lastApplied < this.commitIndex) {
      this.lastApplied++

      const entry = this.log[this.lastApplied]

      if (entry.command) {
        this.kvStore.set(entry.command.key, entry.command.value)
      }
    }
  }

  /**
   * Создаем записи в KV хранилище
   * @property {string} key - Ключ
   * @property {string} value - Значение
   * @returns {boolean}
   * */
  public setValue(key: string, value: string): boolean {
    // Только лидер может принимать изменения
    /* todo: Перенаправить на лидера */
    if (this.state !== State.Leader) return false

    const entry: LogEntryDto = {
      index: this.log.length,
      term: this.currentTerm,
      command: { key, value },
    }

    this.log.push(entry)

    return true
  }

  /**
   * Получить значение из KV хранилища
   * @property {string} key - Ключ
   * @returns {string | undefined}
   * */
  public getValue(key: string): string | undefined {
    return this.kvStore.get(key)
  }

  /**
   * Получить текущее состояние ноды
   * @returns {enum State}
   * */
  public getState(): State {
    return this.state
  }
}
