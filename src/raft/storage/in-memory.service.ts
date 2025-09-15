import { StorageInterface } from './storage.interface'
import { State } from '../enum'
import { LogEntryDto } from '../dto/append-entries.dto'

/**
 * @class
 * @implements {@link StorageInterface}
 * @description Реализация хранилища RAFT в памяти.
 */
export class InMemoryService implements StorageInterface {
  /**
   * @public
   * @type {@link State}
   * @description Текущее состояние ноды.
   */
  public state: State
  /**
   * @public
   * @type {number}
   * @description Текущий срок.
   */
  public currentTerm: number
  /**
   * @public
   * @type {number}
   * @description Индекс последней зафиксированной записи в логе.
   */
  public commitIndex: number
  /**
   * @public
   * @type {number}
   * @description Индекс последней записи в логе.
   */
  public lastApplied: number
  /**
   * @public
   * @type {number|null}
   * @description За кого голосует текущий узел.
   * */
  public votedFor: number | null

  /**
   * @private
   * @type {LogEntryDto}
   * @description Список всех записей (см {@link LogEntryDto}).
   * */
  private log: LogEntryDto[]
  /**
   * @private
   * @type {number[]}
   * @description Индекс следующей записи лога для каждого фоловера.
   * */
  private nextIndex: number[]
  /**
   * @private
   * @type {number[]}
   * @description Индекс последней принятой записи лога для каждого фоловера.
   * */
  private matchIndex: number[]
  /**
   * @private
   * @type {Map<string, string>}
   * @description Key/value хранилище.
   * */
  private kvStore: Map<string, string> = new Map()

  /**
   * @public
   * @description Получает список записей.
   * @returns {LogEntryDto[]} Массив записей лога. (См. {@link LogEntryDto})
   */
  public getLogs(): LogEntryDto[] {
    return this.log
  }

  /**
   * @public
   * @description Получает список записей.
   * @param {LogEntryDto} log - Параметры для записи в логи (См. {@link LogEntryDto})
   * @returns {boolean} Результат записи в логи
   */
  public addLog(log: LogEntryDto): boolean {
    this.log.push(log)

    return true
  }

  /**
   * @public
   * @description Удаляет лог по индексу записи.
   * @param {number} index - Параметры для удаления лога
   * @returns {boolean} Результат удаления
   */
  public removeLog(index: number): boolean {
    this.log.splice(index)
    return true
  }

  /**
   * @public
   * @description Получить массив nextIndex
   * @returns {number[]}
   */
  public getNextIndex(): number[] {
    return this.nextIndex
  }
  /**
   * @public
   * @description Обновить nextIndex
   * @param {number} serviceIndex - Индекс сервиса
   * @param {number} logIndex - Индекс записи
   * @returns {boolean}
   */
  public updateNextIndex(serviceIndex: number, logIndex: number): boolean {
    this.nextIndex[serviceIndex] = logIndex
    return true
  }
  /**
   * @public
   * @description Заменить все nextIndex
   * @param {number[]} index - Индекс сервиса
   * @returns {boolean}
   */
  public setNextIndex(index: number[]): boolean {
    this.nextIndex = index
    return true
  }
  /**
   * @public
   * @description Получить массив matchIndex
   * @returns {number[]}
   */
  public getMatchIndex(): number[] {
    return this.matchIndex
  }
  /**
   * @public
   * @description Обновить matchIndex
   * @param {number} serviceIndex - Индекс сервиса
   * @param {number} logIndex - Индекс записи
   * @returns {boolean}
   */
  public updateMatchIndex(serviceIndex: number, logIndex: number): boolean {
    this.matchIndex[serviceIndex] = logIndex
    return true
  }
  /**
   * @public
   * @description Заменить все matchIndex
   * @param {number[]} index - Индекс сервиса
   * @returns {boolean}
   */
  public setMatchIndex(index: number[]): boolean {
    this.matchIndex = index
    return true
  }

  /**
   * @public
   * @description Создаем записи в KV хранилище
   * @property {string} key - Ключ
   * @property {string} value - Значение
   * @returns {boolean}
   * */
  public setValue(key: string, value: string): boolean {
    this.kvStore.set(key, value)
    return true
  }

  /**
   * @public
   * @description Получить значение из KV хранилища
   * @property {string} key - Ключ
   * @returns {string|undefined}
   * */
  public getValue(key: string): string | undefined {
    return this.kvStore.get(key)
  }
}
