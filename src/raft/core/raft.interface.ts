import { OnModuleInit } from '@nestjs/common'

/**
 * @typedef {Object} ServerConfig
 * @description Конфиг Raft консенсуса, содержит служебные данные.
 * @property {number} index - Index текущего узла в кластере (уникальный инкремент для каждого узла).
 * @property {string[]} servers - Массив узлов (localhost:3000, localhost:3001 ...).
 * @property {number} heartbeatIntervalMs - Таймер опроса фоловеров.
 * @property {number} electionTimeoutMinMs - Минимальное время, после коготорого начнутся выбора.
 * @property {number} electionTimeoutMaxMs - Максимальное время, после коготорого начнутся выбора.
 */
export interface ServerConfig {
  index: number
  servers: string[]
  heartbeatIntervalMs: number
  electionTimeoutMinMs: number
  electionTimeoutMaxMs: number
}

export interface RaftInterface extends OnModuleInit {
  stop(): void
}
