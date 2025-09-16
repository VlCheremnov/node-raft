import { StorageInterface } from './storage.interface'
import { Test, TestingModule } from '@nestjs/testing'
import { InMemoryService } from './in-memory.service'

describe('InMemoryService', () => {
  let storage: StorageInterface

  const testLog = {
    index: 1,
    term: 1,
    command: {
      key: 'key',
      value: 'key',
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InMemoryService],
    }).compile()

    storage = module.get(InMemoryService)
  })

  it('addLog & getLogs & removeLog', () => {
    const result = storage.addLog(testLog)
    expect(result).toBe(true)

    const logs = storage.getLogs()
    expect(logs.length).toBe(2)
    expect(logs[1]).toEqual(testLog)
  })

  it('updateNextIndex & setNextIndex & getNextIndex', () => {
    storage.setNextIndex([1, 2, 3])
    expect(storage.getNextIndex()).toEqual([1, 2, 3])
    storage.updateNextIndex(1, 3)
    expect(storage.getNextIndex()).toEqual([1, 3, 3])
  })

  it('updateMatchIndex & setMatchIndex & getMatchIndex', () => {
    storage.setMatchIndex([1, 2, 3])
    expect(storage.getMatchIndex()).toEqual([1, 2, 3])
    storage.updateMatchIndex(1, 3)
    expect(storage.getMatchIndex()).toEqual([1, 3, 3])
  })

  it('setValue & getValue', () => {
    storage.setValue('key', 'value')
    expect(storage.getValue('key')).toBe('value')
  })

  it('should be defined', () => {
    expect(storage).toBeDefined()
  })
})
