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
