import { StorageInterface } from './storage.interface'
import { State } from '../enum'
import { LogEntryDto } from '../dto/append-entries.dto'

/**
 * @class - Реализация хранилища RAFT в памяти.
 */
export class InMemoryService implements StorageInterface {
  /**
   * Текущее состояние ноды.
   * @public
   * @type {@link State}
   */
  public state: State = State.Follower
  /**
   * Текущий срок.
   * @public
   * @type {number}
   */
  public currentTerm: number = 0
  /**
   * Индекс последней зафиксированной записи в логе.
   * @public
   * @type {number}
   */
  public commitIndex: number = 0
  /**
   * Индекс последней записи в логе.
   * @public
   * @type {number}
   */
  public lastApplied: number = 0
  /**
   * За кого голосует текущий узел.
   * @public
   * @type {number|null}
   * */
  public votedFor: number | null = null

  /**
   * Список всех записей (см {@link LogEntryDto}).
   * @private
   * @type {LogEntryDto}
   * */
  private log: LogEntryDto[] = [{ index: 0, term: 0, command: null }]
  /**
   * Индекс следующей записи лога для каждого фоловера.
   * @private
   * @type {number[]}
   * */
  private nextIndex: number[] = []
  /**
   * Индекс последней принятой записи лога для каждого фоловера.
   * @private
   * @type {number[]}
   * */
  private matchIndex: number[] = []
  /**
   * Key/value хранилище.
   * @private
   * @type {Map<string, string>}
   * */
  private kvStore: Map<string, string> = new Map()

  /**
   * Получает список записей.
   * @public
   * @returns {LogEntryDto[]} Массив записей лога.
   */
  public getLogs(): LogEntryDto[] {
    return this.log
  }

  /**
   * Получает список записей.
   * @public
   * @param {LogEntryDto} log - Параметры для записи в логи.
   * @returns {boolean} Результат записи в логи
   */
  public addLog(log: LogEntryDto): boolean {
    this.log.push(log)

    return true
  }

  /**
   * Удаляет лог по индексу записи.
   * @public
   * @param {number} index - Параметры для удаления лога
   * @returns {boolean} Результат удаления
   */
  public removeLog(index: number): boolean {
    this.log.splice(index)
    return true
  }

  /**
   * Получить массив nextIndex.
   * @public
   * @returns {number[]}
   */
  public getNextIndex(): number[] {
    return this.nextIndex
  }
  /**
   * Обновить nextIndex.
   * @public
   * @param {number} serviceIndex - Индекс сервиса
   * @param {number} logIndex - Индекс записи
   * @returns {boolean}
   */
  public updateNextIndex(serviceIndex: number, logIndex: number): boolean {
    this.nextIndex[serviceIndex] = logIndex
    return true
  }
  /**
   * Заменить все nextIndex.
   * @public
   * @param {number[]} index - Индекс сервиса
   * @returns {boolean}
   */
  public setNextIndex(index: number[]): boolean {
    this.nextIndex = index
    return true
  }
  /**
   * Получить массив matchIndex.
   * @public
   * @returns {number[]}
   */
  public getMatchIndex(): number[] {
    return this.matchIndex
  }
  /**
   * Обновить matchIndex.
   * @public
   * @param {number} serviceIndex - Индекс сервиса
   * @param {number} logIndex - Индекс записи
   * @returns {boolean}
   */
  public updateMatchIndex(serviceIndex: number, logIndex: number): boolean {
    this.matchIndex[serviceIndex] = logIndex
    return true
  }
  /**
   * Заменить все matchIndex.
   * @public
   * @param {number[]} index - Индекс сервиса
   * @returns {boolean}
   */
  public setMatchIndex(index: number[]): boolean {
    this.matchIndex = index
    return true
  }

  /**
   * Создаем записи в KV хранилище
   * @public
   * @property {string} key - Ключ
   * @property {string} value - Значение
   * @returns {boolean}
   * */
  public setValue(key: string, value: string): boolean {
    this.kvStore.set(key, value)
    return true
  }

  /**
   * Получить значение из KV хранилища
   * @public
   * @property {string} key - Ключ
   * @returns {string|undefined}
   * */
  public getValue(key: string): string | undefined {
    return this.kvStore.get(key)
  }
}
