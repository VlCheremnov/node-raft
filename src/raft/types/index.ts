/**
 * @typedef {Object} RequestVoteResult
 * @description Ответ при голосовании за кандидата.
 * @property {number} term - Срок (term) голосования.
 * @property {boolean} voteGranted - Указывает, голосуем за текущего кандидата или нет.
 */
export interface RequestVoteResult {
  term: number
  voteGranted: boolean
}

/**
 * @typedef {Object} AppendEntriesResult
 * @description Ответ фоловера лидеру в heartbeats.
 * @property {number} term - Срок (term) голосования.
 * @property {boolean} success - Статус запроса (true/false).
 */
export interface AppendEntriesResult {
  term: number
  success: boolean
}

/**
 * @typedef {Object} ServerConfig
 * @description Конфиг Raft консенсуса, содержит служебные данные.
 * @property {number} index - Index текущего узла в кластере (уникальный инкремент для каждого узла).
 * @property {string[]} servers - Массив узлов (localhost:3000, localhost:3001 ...).
 * @property {number} heartbeatIntervalMs - Таймер опроса фоловеров.
 * @property {number} electionTimeoutMinMs - Минимальное время, после которого начнутся выбора.
 * @property {number} electionTimeoutMaxMs - Максимальное время, после которого начнутся выбора.
 */
export interface ServerConfig {
  index: number
  servers: string[]
  heartbeatIntervalMs: number
  electionTimeoutMinMs: number
  electionTimeoutMaxMs: number
}
