import { Test, TestingModule } from '@nestjs/testing'
import { RaftService } from './raft.service'
import { KvController } from './kv.controller'

interface MockRaftServiceInterface {
  setValue: () => boolean
  getValue: () => boolean
}

describe('KvController', () => {
  let controller: KvController
  let service: MockRaftServiceInterface

  beforeEach(async () => {
    const mockServices: MockRaftServiceInterface = {
      setValue: jest.fn(() => true),
      getValue: jest.fn(() => true),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KvController],
      providers: [
        {
          provide: RaftService,
          useValue: mockServices,
        },
      ],
    }).compile()

    controller = module.get(KvController)
    service = module.get(RaftService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should return Get', () => {
    const { value } = controller.Get({} as any)
    expect(value).toEqual(true)
    expect(service.getValue).toHaveBeenCalled()
  })

  it('should return Set', () => {
    const { success } = controller.Set({} as any)
    expect(success).toEqual(true)
    expect(service.setValue).toHaveBeenCalled()
  })
})
