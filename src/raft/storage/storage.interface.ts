import { State } from '../enum'
import { LogEntryDto } from '../dto/append-entries.dto'

/**
 * @typedef {Object} StorageInterface
 * @description Интерфейс для хранилища данных RAFT.
 * @property {string} state - Текущее состояние узла (follower, candidate, leader).
 * @property {number} currentTerm - Текущий срок (увеличивается на стадии кандидата или при выборе нового лидера).
 * @property {number} commitIndex - Индекс последней зафиксированной записи в логе.
 * @property {number} lastApplied - Индекс последней записи в логе.
 * @property {number|null} votedFor - За кого голосует текущий узел.
 * @property {() => LogEntryDto[]} getLogs - Получает список записей.
 * @property {(log: LogEntryDto) => boolean} addLog - Записывает значение в конец логов.
 * @property {(index: number) => boolean} removeLog - Удаляет значение по индексу из логов.
 * @property {() => number[]} getNextIndex - Получает индексы следующей записи лога каждого фоловера.
 * @property {(index: number[]) => boolean} setNextIndex - Обновляет все nextIndex.
 * @property {(serviceIndex: number, logIndex: number) => boolean} updateNextIndex - Устанавливает индекс следующей записи лога фоловера.
 * @property {() => number[]} getMatchIndex - Получает индексы последней записи лога каждого фоловера.
 * @property {(index: number[]) => boolean} setMatchIndex - Обновляет все matchIndex.
 * @property {(serviceIndex: number, logIndex: number) => boolean} updateMatchIndex - Устанавливает индекс последней записи лога фоловера.
 * @property {(key: string) => string} getValue - Получает значение по ключу из kvStore.
 * @property {(key: string, value: string) => boolean} setValue - Устанавливает значение по ключу в kvStore.
 */
export interface StorageInterface {
  state: State
  currentTerm: number
  commitIndex: number
  lastApplied: number
  votedFor: number | null

  getLogs(): LogEntryDto[]
  addLog(log: LogEntryDto): boolean
  removeLog(index: number): boolean

  getNextIndex(): number[]
  updateNextIndex(i: number, serviceIndex: number): boolean
  setNextIndex(index: number[]): boolean

  getMatchIndex(): number[]
  updateMatchIndex(i: number, serviceIndex: number): boolean
  setMatchIndex(index: number[]): boolean

  getValue(key: string): string | undefined
  setValue(key: string, value: string): boolean
}
