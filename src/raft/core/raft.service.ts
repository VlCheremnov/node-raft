import { Inject, Injectable } from '@nestjs/common'

import {
  AppendEntriesResult,
  RequestVoteResult,
  ServerConfig,
} from './../types'
import { RaftInterface } from './raft.interface'

import { State } from './../enum'
import { ConfigService } from '@nestjs/config'
import { RequestVoteDto } from './../dto/request-vote.dto'
import { AppendEntriesDto, LogEntryDto } from './../dto/append-entries.dto'
import { StorageInterface } from '../storage/storage.interface'

/**
 * @class
 * @implements {@link RaftInterface}
 * @description Реализация консенсуса RAFT.
 */
@Injectable()
export class RaftService implements RaftInterface {
  /**
   * @private
   * @type {NodeJS.Timeout|null}
   * @description Таймаут выборов
   */
  private electionTimeout: NodeJS.Timeout | null = null
  /**
   * @private
   * @type {NodeJS.Timeout|null}
   * @description Интервал лидера
   */
  private heartbeatInterval: NodeJS.Timeout | null = null

  /**
   * @private
   * @type {@link ServerConfig}
   * @description Конфиги RAFT консенсуса
   */
  private config: ServerConfig

  constructor(
    /**
     * @private
     * @type {@link ConfigService}
     * @description Сервис конфигураций
     */
    private configService: ConfigService,
    /**
     * @private
     * @type {@link StorageInterface}
     * @description Сервис хранилище данных
     */
    @Inject('RaftStorage') private readonly storage: StorageInterface
  ) {
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

    this.storage.setNextIndex(
      new Array(serverLength).fill(this.storage.getLogs().length) as number[]
    )
    this.storage.setMatchIndex(new Array(serverLength).fill(0) as number[])
  }

  /**
   * @public
   * @returns {void}
   * @description Хук инициализации сервиса
   */
  public onModuleInit(): void {
    this.resetElectionTimeout()
  }

  /**
   * @public
   * @returns {void}
   * @description Останавливает сервис
   */
  public stop(): void {
    this.storage.state = State.Follower

    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout)
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
  }

  /**
   * @public
   * @description Запрашивает голос для выборов лидера
   * @param {RequestVoteDto} params - Параметры запроса голосования См. {@link RequestVoteDto}
   * @returns {@link RequestVoteResult} Результат голосования
   */
  public RequestVote(params: RequestVoteDto): RequestVoteResult {
    if (params.term < this.storage.currentTerm) {
      return { term: this.storage.currentTerm, voteGranted: false }
    }

    if (params.term > this.storage.currentTerm) {
      this.storage.currentTerm = params.term
      this.storage.state = State.Follower
      this.storage.votedFor = null
    }

    const logs = this.storage.getLogs()

    const lastLogIndex = logs.length - 1
    const lastLogTerm = logs[lastLogIndex]?.term || -1

    if (
      (this.storage.votedFor === null ||
        this.storage.votedFor === params.candidateId) &&
      (params.lastLogTerm > lastLogTerm ||
        (params.lastLogTerm === lastLogTerm &&
          params.lastLogIndex >= lastLogIndex))
    ) {
      this.storage.votedFor = params.candidateId
      this.resetElectionTimeout()
      return { term: this.storage.currentTerm, voteGranted: true }
    }

    return { term: this.storage.currentTerm, voteGranted: false }
  }

  /**
   * @public
   * @param {AppendEntriesDto} params - Параметры запроса См. {@link AppendEntriesDto}
   * @returns {@link AppendEntriesResult}
   * @description Обработка запроса от лидера
   * */
  public AppendEntries(params: AppendEntriesDto): AppendEntriesResult {
    if (params.term < this.storage.currentTerm)
      return { term: this.storage.currentTerm, success: false }

    /* Если в кластере 2 лидера */
    if (this.storage.state === State.Leader) {
      this.stop()
    }

    if (params.term > this.storage.currentTerm) {
      this.storage.currentTerm = params.term
      this.storage.state = State.Follower
      this.storage.votedFor = null
    }

    /* Сбрасываем таймаут выборов */
    this.resetElectionTimeout()

    const logs = this.storage.getLogs()

    /* Проверка актуальности */
    if (
      params.prevLogIndex >= logs.length ||
      logs[params.prevLogIndex]?.term !== params.prevLogTerm
    ) {
      return { term: this.storage.currentTerm, success: false }
    }

    /* Сохраняем новые данные */
    let index = params.prevLogIndex + 1

    for (const entry of params.entries) {
      if (index < logs.length && logs[index].term !== entry.term) {
        this.storage.removeLog(index)
      }

      if (index >= logs.length) {
        logs.push(entry)
      }

      index++
    }

    // Обновляем KV
    if (params.leaderCommit > this.storage.commitIndex) {
      this.storage.commitIndex = Math.min(params.leaderCommit, logs.length - 1)
      this.applyLogs()
    }

    return { term: this.storage.currentTerm, success: true }
  }

  /**
   * @public
   * @description Создаем записи в KV хранилище
   * @property {string} key - Ключ
   * @property {string} value - Значение
   * @returns {boolean}
   * */
  public setValue(key: string, value: string): boolean {
    // Только лидер может принимать изменения
    /* todo: Перенаправить на лидера */
    if (this.storage.state !== State.Leader) return false

    const entry: LogEntryDto = {
      index: this.storage.getLogs().length,
      term: this.storage.currentTerm,
      command: { key, value },
    }

    this.storage.addLog(entry)

    return true
  }

  /**
   * @public
   * @description Получить значение из KV хранилища
   * @property {string} key - Ключ
   * @returns {string|undefined}
   * */
  public getValue(key: string): string | undefined {
    return this.storage.getValue(key)
  }

  /**
   * @public
   * @description Получить текущее состояние ноды
   * @returns {enum State}
   * */
  public getState(): State {
    return this.storage.state
  }

  /**
   * @private
   * @returns {Promise void}
   * @description После истечения таймаута запускаем голосование на переизбрания лидера
   * */
  private async handleElectionTimeout(): Promise<void> {
    if (this.storage.state === State.Leader) return

    this.storage.state = State.Candidate
    this.storage.currentTerm++
    this.storage.votedFor = this.config.index

    const voteGranted = await this.sendRequestVote()

    if (voteGranted) {
      this.becomeLeader()
    } else {
      this.storage.state = State.Follower
      this.resetElectionTimeout()
    }
  }

  /**
   * @private
   * @description Запрос для RequestVote и подсчет голосов (HTTP POST к другим нодам)
   * @returns {Promise boolean}
   * */
  private async sendRequestVote(): Promise<boolean> {
    const logs = this.storage.getLogs()

    const promises = this.config.servers.map((addr, i) => {
      if (i === this.config.index) return { voteGranted: true } // Сам себе vote

      const params: RequestVoteDto = {
        term: this.storage.currentTerm,
        candidateId: this.config.index,
        lastLogIndex: logs.length - 1,
        lastLogTerm: logs[logs.length - 1].term,
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
   * @private
   * @description Избирает текущую ноду лидером и запускает heartbeat
   * @returns {void}
   * */
  private becomeLeader(): void {
    const nextIndex = this.storage.getNextIndex()
    const matchIndex = this.storage.getMatchIndex()
    const logs = this.storage.getLogs()

    this.storage.state = State.Leader
    this.storage.setNextIndex(nextIndex.map(() => logs.length))
    this.storage.setMatchIndex(matchIndex.map(() => 0))

    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeatIntervalMs
    )
    if (this.electionTimeout) clearTimeout(this.electionTimeout)
  }

  /**
   * @private
   * @description Отправляем heartbeat на другие ноды
   * @returns {Promise void}
   * */
  private async sendHeartbeat(): Promise<void> {
    if (this.storage.state !== State.Leader) return

    const logs = this.storage.getLogs()
    const nextIndex = this.storage.getNextIndex()

    const promises = this.config.servers.map((addr, i) => {
      if (i === this.config.index) return { success: true }

      const prevLogIndex = nextIndex[i] - 1
      const entries = logs.slice(nextIndex[i])

      const params: AppendEntriesDto = {
        term: this.storage.currentTerm,
        leaderId: this.config.index,
        prevLogIndex,
        prevLogTerm:
          prevLogIndex >= 0 && logs[prevLogIndex] ? logs[prevLogIndex].term : 0,
        entries,
        leaderCommit: this.storage.commitIndex,
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
   * @private
   * @description Обрабатываем ответ heartbeat от другой ноды
   * @param {AppendEntriesResult} result - Ответ ноды См. {@link AppendEntriesResult}
   * @param {number} index - Индекс ноды, от которой поступил ответ
   * @returns {@link AppendEntriesResult}
   * */
  private handleHeartbeatResponse(
    result: AppendEntriesResult,
    index: number
  ): AppendEntriesResult {
    const logs = this.storage.getLogs()
    const nextIndex = this.storage.getNextIndex()

    if (result.success) {
      /* Успешный запрос - обновляем индексы ноды */
      this.storage.updateNextIndex(index, logs.length)
      this.storage.updateMatchIndex(index, logs.length - 1)
    } else if (result.term > this.storage.currentTerm) {
      /* Данные лидера не актуальны - откатываем состояние до фоловера и ждем переизбрания */
      this.storage.state = State.Follower
      this.storage.currentTerm = result.term
    } else {
      /* Данные в nextIndex по текущей ноде не актуальны, откатываем и пробуем еще дальше */
      if (nextIndex[index] > 0)
        this.storage.updateNextIndex(index, nextIndex[index] - 1)
    }
    return result
  }

  /**
   * @private
   * @description Обрабатываем ошибку heartbeat от другой ноды
   * @returns {{ success: boolean }} Результат обработки запроса, где success указывает, успешно ли выполнено сохранение
   * */
  private handleHeartbeatError(): { success: boolean } {
    return { success: false }
  }

  /**
   * @private
   * @description Обновить commitIndex
   * @returns {void}
   * */
  private updateCommitIndex(): void {
    const logs = this.storage.getLogs()
    const matchIndex = this.storage.getMatchIndex()

    for (
      let logIndex = logs.length - 1;
      logIndex > this.storage.commitIndex;
      logIndex--
    ) {
      const matches = matchIndex.filter((m) => m >= logIndex).length + 1 // +1 для себя

      if (
        matches > this.config.servers.length / 2 &&
        logs[logIndex].term === this.storage.currentTerm
      ) {
        this.storage.commitIndex = logIndex
        this.applyLogs()
        break
      }
    }
  }

  /**
   * @private
   * @description Рандомное число от и до
   * @param {number} min - Минимальное число
   * @param {number} max - Максимальное число
   * @returns {number} Рандомное число
   * */
  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * @private
   * @description Сброс таймаута выборов
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
   * @private
   * @description Применить логи к KV хранилище
   * @returns {void}
   * */
  private applyLogs(): void {
    while (this.storage.lastApplied < this.storage.commitIndex) {
      this.storage.lastApplied++

      const entry = this.storage.getLogs()[this.storage.lastApplied]

      if (entry.command) {
        this.storage.setValue(entry.command.key, entry.command.value)
      }
    }
  }
}
