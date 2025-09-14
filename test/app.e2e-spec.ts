import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { ConfigService } from '@nestjs/config'
import { RaftService } from '../src/raft/raft.service'
import { State } from '../src/raft/enum'

enum KvDataKeys {
  Test1 = 'key-1',
  Test2 = 'key-2',
  Test3 = 'key-3',
  Test4 = 'key-4',
  Test5 = 'key-5',
}

const KvData = {
  [KvDataKeys.Test1]: 'value-1',
  [KvDataKeys.Test2]: 'value-2',
  [KvDataKeys.Test3]: 'value-3',
  [KvDataKeys.Test4]: 'value-4',
  [KvDataKeys.Test5]: 'value-5',
}

/*  */
const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Проверяем, существует ли сервер
const isAppRunning = (app: INestApplication<App>): boolean =>
  !!(app.getHttpServer() as any)?.address()

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

const waitCommitLogs = (apps: INestApplication<App>[], index: number) =>
  waitForCondition(() => {
    const services: unknown[] = apps.map((app) => app.get(RaftService))

    const okCommitIndex = services.every(
      (service: { commitIndex: number }) => service.commitIndex === index
    )
    const okLastApplied = services.every(
      (service: { lastApplied: number }) => service.lastApplied === index
    )

    return okCommitIndex && okLastApplied
  })

const waitBecomeLeader = (apps: INestApplication<App>[]) =>
  waitForCondition(() => {
    const states = apps.map((app) => app.get(RaftService).getState())
    const leaders = states.filter((state) => state === State.Leader).length

    return leaders === 1
  })

describe('AppController (e2e)', () => {
  let apps: INestApplication<App>[] = []
  const ports: number[] = [3001, 3002, 3003, 3004, 3005]

  beforeAll(async () => {
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

    await waitBecomeLeader(apps)
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
      await waitCommitLogs(apps, 1)
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
    it('Несколько set, репликация и get key на всех нодах', async () => {
      for (const app of apps) {
        const raftService = app.get(RaftService)

        const state = raftService.getState()

        if (state !== State.Leader) {
          continue
        }

        await Promise.all([
          request(app.getHttpServer())
            .post(`/kv/set`)
            .send({ key: KvDataKeys.Test2, value: KvData[KvDataKeys.Test2] })
            .expect(200)
            .then(({ body }) => {
              expect(body.success).toBe(true)
            }),
          request(app.getHttpServer())
            .post(`/kv/set`)
            .send({ key: KvDataKeys.Test3, value: KvData[KvDataKeys.Test3] })
            .expect(200)
            .then(({ body }) => {
              expect(body.success).toBe(true)
            }),
        ])
      }

      /* Ждем пока рафт примет изменения */
      await waitCommitLogs(apps, 3)

      for (const app of apps) {
        await Promise.all([
          request(app.getHttpServer())
            .post(`/kv/get`)
            .send({ key: KvDataKeys.Test2 })
            .expect(200)
            .then(({ body }) => {
              expect(body.value).toBe(KvData[KvDataKeys.Test2])
            }),
          request(app.getHttpServer())
            .post(`/kv/get`)
            .send({ key: KvDataKeys.Test3 })
            .expect(200)
            .then(({ body }) => {
              expect(body.value).toBe(KvData[KvDataKeys.Test3])
            }),
        ])
      }
    })
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

      await waitBecomeLeader(apps)
    })
    it('Восстановление консенсуса при двух лидерах', async () => {
      const follower = apps.find(
        (app) => app.get(RaftService).getState() === State.Follower
      )!

      const raftService = follower.get(RaftService)

      ;(raftService as any).becomeLeader()

      await waitBecomeLeader(apps)
    })
  })

  describe('Отказоустойчивость:', () => {
    it('5 нод, 1-2 down — кластер работает, set/get ok', async () => {
      for (let i = 0; i < 2; i++) {
        const app = apps[i]
        const raftService = app.get(RaftService)

        raftService.stop()
        await app.close()
      }

      await waitBecomeLeader(apps)

      const leader = apps.find(
        (app) =>
          isAppRunning(app) && app.get(RaftService).getState() === State.Leader
      )!

      await request(leader.getHttpServer())
        .post(`/kv/set`)
        .send({ key: KvDataKeys.Test4, value: KvData[KvDataKeys.Test4] })
        .expect(200)
        .then(({ body }) => {
          expect(body.success).toBe(true)
        })

      /* Ждем пока рафт примет изменения */
      await waitCommitLogs([leader], 4)

      await request(leader.getHttpServer())
        .post(`/kv/get`)
        .send({ key: KvDataKeys.Test4 })
        .expect(200)
        .then(({ body }) => {
          expect(body.value).toBe(KvData[KvDataKeys.Test4])
        })
    })
    it('5 нод, 3 down — set/get failure', async () => {
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i]
        const raftService = app.get(RaftService)

        if (isAppRunning(app) && raftService.getState() !== State.Leader) {
          raftService.stop()
          await app.close()
          break
        }
      }

      const leader = apps.find(
        (app) =>
          isAppRunning(app) && app.get(RaftService).getState() === State.Leader
      )!

      await request(leader.getHttpServer())
        .post(`/kv/set`)
        .send({ key: KvDataKeys.Test5, value: KvData[KvDataKeys.Test5] })
        .expect(200)
        .then(({ body }) => {
          expect(body.success).toBe(true)
        })

      await expect(waitCommitLogs([leader], 5)).rejects.toThrow()
    })
    it('Восстановление после перезапуска', async () => {
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i]

        if (!isAppRunning(app)) {
          const configService = app.get(ConfigService)
          const port = configService.get<number>('PORT', 3000)

          const raftService = app.get(RaftService)
          await app.listen(port)
          raftService.onModuleInit()
        }
      }

      await waitCommitLogs(apps, 5)

      for (const app of apps) {
        await Promise.all([
          request(app.getHttpServer())
            .post(`/kv/get`)
            .send({ key: KvDataKeys.Test5 })
            .expect(200)
            .then(({ body }) => {
              expect(body.value).toBe(KvData[KvDataKeys.Test5])
            }),
        ])
      }
    })
  })

  describe('Выборы:', () => {})
})
