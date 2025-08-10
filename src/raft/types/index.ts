/**
 * @typedef {Object} LogEntry - Запись консенсуса
 * @property {number} index - Index лога
 * @property {number} term - Срок (term) голосования
 * @property {Object|null} command - Команда записи
 */
export interface LogEntry {
  index: number
  term: number
  command: { key: string; value: string } | null
}

/**
 * @typedef {Object} RequestVoteParams - Конфиг Raft консенсуса, содержит служебные данные
 * @property {number} index - Index текущего узла в кластере (уникальный инкремент для каждого узла)
 * @property {string[]} servers - Массив узлов (localhost:3000, localhost:3001 ...)
 * @property {number} heartbeatIntervalMs - Таймер опроса фоловеров
 * @property {number} electionTimeoutMinMs - Минимальное время, после коготорого начнутся выбора
 * @property {number} electionTimeoutMaxMs - Максимальное время, после коготорого начнутся выбора
 */
export interface ServerConfig {
  index: number
  servers: string[]
  heartbeatIntervalMs: number
  electionTimeoutMinMs: number
  electionTimeoutMaxMs: number
}

/**
 * @typedef {Object} RequestVoteParams - Параметры для выбора кандидата
 * @property {number} term - Срок (term) голосования
 * @property {number} candidateId - ID кандидата
 * @property {number} lastLogIndex - Индекс последнего лога
 * @property {number} lastLogTerm - Последний срок лога
 */
export interface RequestVoteParams {
  term: number
  candidateId: number
  lastLogIndex: number
  lastLogTerm: number
}

/**
 * @typedef {Object} RequestVoteResult - Ответ при голосовании за кандидата
 * @property {number} term - Срок (term) голосования
 * @property {boolean} voteGranted - Указывает, голосуем за текущего кандидата или нет
 */
export interface RequestVoteResult {
  term: number
  voteGranted: boolean
}

/**
 * @typedef {Object} AppendEntriesParams - Параметры запроса к фоловеру от лидера на стадии heartbeat
 * @property {number} term - Срок (term) голосования
 * @property {number} leaderId - Id лидера
 * @property {number} prevLogIndex - Последний индекс лога для текущего фоловера у лидера
 * @property {number} prevLogTerm - Последний срок лога для текущего фоловера у лидера
 * @property {number} entries - Список записей начиная с prevLogIndex
 * @property {number} leaderCommit - Последняя зафикасированная запись у лидера
 */
export interface AppendEntriesParams {
  term: number
  leaderId: number
  prevLogIndex: number
  prevLogTerm: number
  entries: LogEntry[]
  leaderCommit: number
}

/**
 * @typedef {Object} AppendEntriesResult - Ответ фоловера лидеру в heartbeats
 * @property {number} term - Срок (term) голосования
 * @property {boolean} success - Статус запроса (true/false)
 */
export interface AppendEntriesResult {
  term: number
  success: boolean
}
