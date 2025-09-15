/**
 * @typedef {'Follower' | 'Candidate' | 'Leader'} State
 * @description Возможные состояния узла в RAFT-протоколе.
 * @enum {string}
 */
export enum State {
  Follower = 'Follower',
  Candidate = 'Candidate',
  Leader = 'Leader',
}
