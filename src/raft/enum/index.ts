/**
 * Возможные состояния узла в RAFT-протоколе.
 * @typedef {'Follower' | 'Candidate' | 'Leader'} State
 * @enum {string}
 */
export enum State {
  Follower = 'Follower',
  Candidate = 'Candidate',
  Leader = 'Leader',
}
