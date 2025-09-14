import { StorageInterface } from './storage.interface'
import { State } from '../enum'
import { LogEntryDto } from '../dto/append-entries.dto'

export class ImMemoryService implements StorageInterface {
  public state: State
  public currentTerm: number
  public commitIndex: number
  public lastApplied: number
  public votedFor: number | null

  private log: LogEntryDto[]
  public getLogs() {
    return this.log
  }
  public addLog(log: LogEntryDto) {
    this.log.push(log)

    return true
  }
  public removeLog(index: number) {
    this.log.splice(index)
    return true
  }

  private nextIndex: number[]
  public getNextIndex() {
    return this.nextIndex
  }
  public updateNextIndex(i: number, serviceIndex: number) {
    this.nextIndex[i] = serviceIndex
    return true
  }
  public setNextIndex(index: number[]) {
    this.nextIndex = index
    return true
  }

  private matchIndex: number[]
  public getMatchIndex() {
    return this.matchIndex
  }
  public updateMatchIndex(i: number, serviceIndex: number) {
    this.matchIndex[i] = serviceIndex
    return true
  }
  public setMatchIndex(index: number[]) {
    this.matchIndex = index
    return true
  }

  private kvStore: Map<string, string> = new Map()
  public setValue(key: string, value: string) {
    this.kvStore.set(key, value)
    return true
  }
  public getValue(key: string) {
    return this.kvStore.get(key)
  }
}
