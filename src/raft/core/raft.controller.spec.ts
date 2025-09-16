import { Test, TestingModule } from '@nestjs/testing'
import { RaftController } from './raft.controller'
import { RaftService } from './raft.service'

interface MockRaftServiceInterface {
  RequestVote: () => boolean
  AppendEntries: () => boolean
}

describe('RaftController', () => {
  let controller: RaftController
  let service: MockRaftServiceInterface

  beforeEach(async () => {
    const mockServices: MockRaftServiceInterface = {
      RequestVote: jest.fn(() => true),
      AppendEntries: jest.fn(() => true),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RaftController],
      providers: [
        {
          provide: RaftService,
          useValue: mockServices,
        },
      ],
    }).compile()

    controller = module.get(RaftController)
    service = module.get(RaftService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should return RequestVote', () => {
    const result = controller.RequestVote({} as any)
    expect(result).toEqual(true)
    expect(service.RequestVote).toHaveBeenCalled()
  })

  it('should return AppendEntries', () => {
    const result = controller.AppendEntries({} as any)
    expect(result).toEqual(true)
    expect(service.AppendEntries).toHaveBeenCalled()
  })
})
