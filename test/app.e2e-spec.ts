import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { ConfigService } from '@nestjs/config'
import { RaftService } from '../src/raft/raft.service'
import { State } from '../src/raft/enum'

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

enum KvDataKeys {
  Test1 = 'key-1',
  Test2 = 'key-2',
  Test3 = 'key-3',
}

const KvData = {
  [KvDataKeys.Test1]: 'value-1',
  [KvDataKeys.Test2]: 'value-2',
  [KvDataKeys.Test3]: 'value-3',
}

const waitForCondition: (
  conditionFunc: () => boolean,
  attemptsLength?: number,
  errorMessage?: string
) => Promise<void> = async (
  conditionFunc,
  attemptsLength = 20,
  errorMessage = 'Failed condition'
) => {
  let attempts = 0

  while (attempts < attemptsLength) {
    const value = conditionFunc()

    if (value) return

    await sleep(100)
    attempts++
  }

  throw new Error(errorMessage)
}

describe('AppController (e2e)', () => {
  let apps: INestApplication<App>[] = []
  const ports: number[] = [3001, 3002, 3003, 3004, 3005]

  beforeAll(async () => {
    console.log('beforeAll')
    for (let i = 0; i < ports.length; i++) {
      const port = ports[i]

      const mockConfigService = {
        get: jest.fn((key: string, defaultValue: string | number) => {
          if (key === 'PORT') return port
          else if (key === 'INDEX') return i
          else if (key === 'PEERS')
            return ports.map((p) => `http://localhost:${p}`).join(',')
          else if (key === 'HEARTBEAT_INTERVAL_MS') return 100
          else if (key === 'ELECTION_TIMEOUT_MIN_MS') return 150
          else if (key === 'ELECTION_TIMEOUT_MAX_MS') return 300
          else return process.env[key] || defaultValue
        }),
      }

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile()

      const app: INestApplication<App> = moduleFixture.createNestApplication()
      await app.listen(port)

      apps.push(app)
    }

    await waitForCondition(() => {
      const states = apps.map((app) => app.get(RaftService).getState())
      const leaders = states.filter((s) => s === State.Leader).length

      return leaders === 1
    })
  })

  afterAll(async () => {
    for (const app of apps) {
      const raftService = app.get(RaftService)
      raftService.stop()
      await app.close()
    }
    apps = []
  })

  describe('KV:', () => {
    it('Set key на лидере и репликация на фолловеры', async () => {
      for (const app of apps) {
        const raftService = app.get(RaftService)

        await request(app.getHttpServer())
          .post(`/kv/set`)
          .send({ key: KvDataKeys.Test1, value: KvData[KvDataKeys.Test1] })
          .expect(200)
          .then(({ body, status }) => {
            const state = raftService.getState()

            if (state === State.Follower) {
              expect(body.success).toBe(false)
            } else if (state === State.Leader) {
              expect(body.success).toBe(true)
            }
          })
      }

      /* Ждем пока рафт примет изменения */
      await waitForCondition(() => {
        const services: unknown[] = apps.map((app) => app.get(RaftService))
        const okCommitIndex = services.every(
          (service: { commitIndex: number }) => service.commitIndex === 1
        )
        const okLastApplied = services.every(
          (service: { lastApplied: number }) => service.lastApplied === 1
        )

        return okCommitIndex && okLastApplied
      })
    })
    it('Get key на любой ноде', async () => {
      for (const app of apps) {
        await request(app.getHttpServer())
          .post(`/kv/get`)
          .send({ key: KvDataKeys.Test1 })
          .expect(200)
          .then(({ body }) => {
            expect(body.value).toBe(KvData[KvDataKeys.Test1])
          })
      }
    })
    it('Несколько set, репликация и get key на всех нодах', async () => {})
  })

  describe('Базовый консенсус и выборы лидера:', () => {
    it('Новый лидер после таймаута (если лидер не шлёт heartbeat).', async () => {
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i]
        const raftService = app.get(RaftService)

        const state = raftService.getState()

        if (state === State.Leader) {
          raftService.stop()
          ;(raftService as any).state = State.Follower
          break
        }

        if (i === apps.length - 1) {
          throw new Error('Лидер не найден')
        }
      }

      await waitForCondition(() => {
        const states = apps.map((app) => app.get(RaftService).getState())
        const leaders = states.filter((s) => s === State.Leader).length

        return leaders === 1
      })
    })
    it('Восстановление консенсуса при двух лидерах', async () => {})
  })

  describe('Отказоустойчивость:', () => {
    it('5 нод, 1-2 down — кластер работает, set/get ok', async () => {})
    it('5 нод, 3 down — set/get failure, но восстановление после перезапуска', async () => {})
    it('High load: много set, проверка на backlog in log.', async () => {})
  })
})
