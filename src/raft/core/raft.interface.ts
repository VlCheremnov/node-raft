import { OnModuleInit } from '@nestjs/common'
import { RequestVoteDto } from '../dto/request-vote.dto'
import { AppendEntriesResult, RequestVoteResult } from '../types'
import { AppendEntriesDto } from '../dto/append-entries.dto'
import { State } from '../enum'

/**
 * @typedef {Object} RaftInterface
 * @extends {OnModuleInit}
 * @description Интерфейс для реализации консенсуса RAFT.
 * @property {() => void} stop - Остановить все таймеры и перевести состояние в фоловера.
 * @property {(params: RequestVoteDto) => RequestVoteResult} RequestVote - Запрашивает голос для выборов лидера.
 * @property {(params: AppendEntriesDto) => AppendEntriesResult} AppendEntries - Обработка запроса от лидера.
 * @property {(key: string, value: string) => boolean} setValue - Создаем записи в KV хранилище.
 * @property {(key: string) => string | undefined} getValue - Получить значение из KV хранилища.
 * @property {() => enum State} getState - Получить текущее состояние ноды.
 */
export interface RaftInterface extends OnModuleInit {
  stop(): void
  RequestVote(params: RequestVoteDto): RequestVoteResult
  AppendEntries(params: AppendEntriesDto): AppendEntriesResult
  setValue(key: string, value: string): boolean
  getValue(key: string): string | undefined
  getState(): State
}
