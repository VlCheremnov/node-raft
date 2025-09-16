import { Test, TestingModule } from '@nestjs/testing'
import { RaftService } from '../raft/core/raft.service'
import { ConfigService } from '@nestjs/config'
import { State } from '../raft/enum'
import { CommandDto, LogEntryDto } from '../raft/dto/append-entries.dto'
import fetchMock from 'jest-fetch-mock'
import { RequestVoteResult, AppendEntriesResult } from '../raft/types'

describe('RaftService', () => {
  let service: RaftService

  beforeEach(async () => {
    fetchMock.resetMocks()
    jest.useFakeTimers()

    const mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue: string | number) => {
          return defaultValue
        }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaftService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<RaftService>(RaftService)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('RequestVote RPC', () => {
    it('Отказ, если уже проголосовали за другого в этом term', () => {
      ;(service as any).votedFor = 1

      const { voteGranted } = service.RequestVote({
        term: 0,
        candidateId: 2,
        lastLogIndex: 1,
        lastLogTerm: 1,
      })

      expect(voteGranted).toBe(false)
      expect((service as any).votedFor).toBe(1)
    })

    it('Отказ, если лог кандидата не up-to-date (меньший lastLogTerm или короче при равном term)', () => {
      const { voteGranted } = service.RequestVote({
        term: 0,
        candidateId: 1,
        lastLogIndex: -1,
        lastLogTerm: -1,
      })

      expect(voteGranted).toBe(false)
      expect((service as any).votedFor).toBe(null)
    })

    it('Грант, если лог кандидата лучше (более высокий term в последней записи)', () => {
      const { voteGranted } = service.RequestVote({
        term: 0,
        candidateId: 1,
        lastLogIndex: 0,
        lastLogTerm: 1,
      })

      expect(voteGranted).toBe(true)
      expect((service as any).votedFor).toBe(1)
    })

    it('Step down, если term кандидата выше, даже если vote не granted', () => {
      ;(service as any).currentTerm = 2

      const { voteGranted } = service.RequestVote({
        term: 1,
        candidateId: 1,
        lastLogIndex: 10,
        lastLogTerm: 1,
      })

      expect(voteGranted).toBe(false)
      expect((service as any).votedFor).toBe(null)
    })

    it('Голосование за кандидата с более высоким term', () => {
      const { voteGranted } = service.RequestVote({
        term: 1,
        candidateId: 1,
        lastLogIndex: 0,
        lastLogTerm: 0,
      })

      expect(voteGranted).toBe(true)
      expect((service as any).votedFor).toBe(1)
    })

    it('Отказывает в голосе, если term кандидата меньше currentTerm', () => {
      ;(service as any).currentTerm = 2

      const serviceCurrentTerm = (service as any).currentTerm as number

      const params = {
        term: 1,
        candidateId: 1,
        lastLogIndex: 0,
        lastLogTerm: 0,
      }

      const result = service.RequestVote(params)

      expect(result).toEqual({
        term: serviceCurrentTerm,
        voteGranted: false,
      })

      expect((service as any).currentTerm as number).toBe(serviceCurrentTerm)
      expect((service as any).state).toBe(State.Follower)
      expect((service as any).votedFor).toBeNull()
    })
  })

  describe('setKey и getKey (KV хранилище)', () => {
    const key = 'key'
    const value = 'value'

    it('Получить текущее состояние ноды', () => {
      expect(service.getState()).toBe((service as any).state)
    })

    it('Успешный set как лидер: добавление в log и kv', () => {
      ;(service as any).state = State.Leader
      ;(service as any).commitIndex = 1

      const result = service.setValue(key, value)
      const logs = (service as any).log as LogEntryDto[]

      expect(result).toBe(true)
      expect(logs[logs.length - 1]).toEqual({
        index: logs.length - 1,
        term: (service as any).currentTerm as number,
        command: { key, value },
      })
      ;(service as any).applyLogs()
      expect(service.getValue(key)).toBe(value)
    })

    it('Отказ в set, если не лидер', () => {
      ;(service as any).state = State.Follower

      const resultFolower = service.setValue(key, value)

      ;(service as any).state = State.Candidate

      const resultCandidate = service.setValue(key, value)

      expect(resultFolower).toBe(false)
      expect(resultCandidate).toBe(false)
    })

    it('Get undefined для несуществующего ключа', () => {
      expect(service.getValue(key)).toBe(undefined)
    })
    it('Конфликт: set одного ключа несколько раз, проверка финального значения', () => {
      const secondValue = value + '-1'
      ;(service as any).state = State.Leader
      const logs = (service as any).log as LogEntryDto[]

      /* Добавляем первую запись лог */
      const firstResult = service.setValue(key, value)
      ;(service as any).commitIndex = 1

      /* Проверяем логи */
      expect(firstResult).toBe(true)
      expect(logs[1]).toEqual({
        index: 1,
        term: 0,
        command: { key, value },
      })

      /* Принимаем логи и проверяем значение */
      ;(service as any).applyLogs()
      expect(service.getValue(key)).toBe(value)

      /* Добавляем вторую запись лог */
      const secondResult = service.setValue(key, secondValue)
      ;(service as any).commitIndex = 2

      /* Проверяем логи */
      expect(secondResult).toBe(true)
      expect(logs[2]).toEqual({
        index: 2,
        term: 0,
        command: { key, value: secondValue },
      })

      /* Принимаем логи и проверяем значение */
      ;(service as any).applyLogs()
      expect(service.getValue(key)).toBe(secondValue)
    })
  })

  describe('AppendEntries RPC (heartbeat и репликация)', () => {
    const key = 'key'
    const value = 'value'

    const command: CommandDto = { key, value }

    const logEntry: LogEntryDto = { index: 1, term: 1, command }

    it('Успех heartbeat (пустые entries), сброс таймаута', () => {
      const log = {
        term: 1,
        leaderId: 1,
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 1,
        entries: [logEntry],
      }

      const { term: currentTerm, success } = service.AppendEntries(log)

      const logs = (service as any).log as LogEntryDto[]

      expect(success).toBe(true)
      expect(currentTerm).toBe(log.term)

      expect(logs[1]).toEqual(logEntry)
      expect(service.getValue(key)).toBe(value)
      expect(jest.getTimerCount()).toBe(1)
      expect(service.getState()).toBe(State.Follower)
      expect((service as any).votedFor).toBe(null)
    })
    it('Отказ, если term лидера ниже.', () => {
      ;(service as any).currentTerm = 2

      const log = {
        term: 1,
        leaderId: 1,
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 1,
        entries: [logEntry],
      }

      const { success } = service.AppendEntries(log)

      expect(success).toBe(false)
    })
    it('Отказ при несоответствии prevLogIndex/prevLogTerm (consistency check).', () => {
      const { success: firstSuccess } = service.AppendEntries({
        term: 1,
        leaderId: 1,
        prevLogIndex: -1,
        prevLogTerm: 0,
        leaderCommit: 1,
        entries: [logEntry],
      })

      expect(firstSuccess).toBe(false)

      const { success: secondSuccess } = service.AppendEntries({
        term: -1,
        leaderId: 1,
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 1,
        entries: [logEntry],
      })

      expect(secondSuccess).toBe(false)
    })
    it('Append новых entries, удаление конфликтующих (truncate log).', () => {
      ;(service as any).state = State.Leader
      const logs = (service as any).log as LogEntryDto[]

      service.setValue(command.key, command.value)
      service.setValue(command.key, command.value)

      expect(logs.length).toBe(3)

      const log = {
        term: 1,
        leaderId: 1,
        prevLogIndex: 0,
        prevLogTerm: 0,
        leaderCommit: 1,
        entries: [logEntry],
      }

      const { success } = service.AppendEntries(log)

      expect(logs.length).toBe(2)
      expect(success).toBe(true)
    })
  })

  describe('Election timeout и become candidate/leader', () => {
    it('Таймаут: не переизбераем лидера', async () => {
      ;(service as any).state = State.Leader
      await (service as any).handleElectionTimeout()

      expect(jest.getTimerCount()).toBe(0)
    })
    it('Таймаут: стать кандидатом, инкремент term, vote for self.', async () => {
      const promise = (service as any).handleElectionTimeout() as Promise<void>

      let state = (service as any).state as State

      expect(state).toBe(State.Candidate)

      await promise

      state = (service as any).state as State
      const currentTerm = (service as any).currentTerm as number
      const votedFor = (service as any).votedFor as number | null
      const index = (service as any).config?.index as number

      expect(state).toBe(State.Leader)
      expect(currentTerm).toBe(1)
      expect(votedFor).toBe(index)
    })

    it('Выборы с фейковыми ответами (grant).', async () => {
      fetchMock.mockResponse(
        JSON.stringify({ term: 0, voteGranted: true } as RequestVoteResult)
      )
      ;(service as any).config.servers = ['1', '2', '3']
      await (service as any).handleElectionTimeout()

      expect(service.getState()).toBe(State.Leader)
      expect((service as any).currentTerm).toBe(1)
    })
    it('Выборы с фейковыми ответами (false).', async () => {
      fetchMock.mockResponse(
        JSON.stringify({ term: 2, voteGranted: false } as RequestVoteResult)
      )
      ;(service as any).config.servers = ['1', '2', '3']
      await (service as any).handleElectionTimeout()

      expect(service.getState()).toBe(State.Follower)
      expect((service as any).currentTerm).toBe(1)
    })
  })

  describe('Лидерские функции (heartbeat, updateCommitIndex):', () => {
    const key = 'key'
    const value = 'value'

    it('Send heartbeat (ответ success с текущим term)', async () => {
      ;(service as any).state = State.Leader
      ;(service as any).currentTerm = 1
      ;(service as any).config.servers = ['1', '2', '3']

      service.setValue(key, value)

      const logs = (service as any).log as LogEntryDto[]

      expect(logs[1]).toEqual({
        index: 1,
        term: 1,
        command: { key, value },
      })

      fetchMock.mockResponse(
        JSON.stringify({ term: 1, success: true } as AppendEntriesResult)
      )

      await (service as any).sendHeartbeat()

      expect(service.getState()).toBe(State.Leader)
      expect((service as any).currentTerm).toBe(1)
      expect(service.getValue(key)).toBe(value)

      expect(logs[1]).toEqual({
        index: 1,
        term: 1,
        command: { key, value },
      })
    })

    it('Send heartbeat (ответ success с term выше)', async () => {
      ;(service as any).state = State.Leader
      ;(service as any).currentTerm = 1
      ;(service as any).config.servers = ['1', '2', '3']

      service.setValue(key, value)

      const logs = (service as any).log as LogEntryDto[]

      expect(logs[1]).toEqual({
        index: 1,
        term: 1,
        command: { key, value },
      })

      fetchMock.mockResponse(
        JSON.stringify({ term: 2, success: false } as AppendEntriesResult)
      )

      await (service as any).sendHeartbeat()

      expect(service.getState()).toBe(State.Follower)
      expect((service as any).currentTerm).toBe(2)
      expect(service.getValue(key)).toBe(undefined)

      expect(logs[1]).toEqual({
        index: 1,
        term: 1,
        command: { key, value },
      })
    })

    it('Send heartbeat (ответ failure с текущим term)', async () => {
      ;(service as any).state = State.Leader
      ;(service as any).currentTerm = 1
      ;(service as any).config.servers = ['1', '2', '3']
      ;(service as any).nextIndex = [0, 3, 3]

      service.setValue(key, value)
      service.setValue(key, value)
      service.setValue(key, value)

      const logs = (service as any).log as LogEntryDto[]

      expect(logs[1]).toEqual({
        index: 1,
        term: 1,
        command: { key, value },
      })

      fetchMock.mockResponse(
        JSON.stringify({ term: 1, success: false } as AppendEntriesResult)
      )

      await (service as any).sendHeartbeat()

      // toStrictEqual

      expect(service.getState()).toBe(State.Leader)
      expect((service as any).currentTerm).toBe(1)
      expect(service.getValue(key)).toBe(undefined)
      expect((service as any).nextIndex).toStrictEqual([0, 2, 2])

      expect(logs[1]).toEqual({
        index: 1,
        term: 1,
        command: { key, value },
      })
    })
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
