import { Test, TestingModule } from '@nestjs/testing'
import { RaftController } from './raft.controller'
import { RaftService } from './raft.service'
import { ConfigService } from '@nestjs/config'

describe('RaftController', () => {
  let controller: RaftController

  beforeEach(async () => {
    const mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue: string | number) => {
          return defaultValue
        }),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RaftController],
      providers: [
        RaftService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    controller = module.get<RaftController>(RaftController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
