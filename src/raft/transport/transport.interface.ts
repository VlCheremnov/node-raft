import { RequestVoteDto } from '../dto/request-vote.dto'
import { AppendEntriesResult, RequestVoteResult } from '../types'
import { AppendEntriesDto } from '../dto/append-entries.dto'

/**
 * Интерфейс транспорта, для обмена данными в RAFT консенсусе.
 * @typedef {Object} TransportInterface
 * @property {(host: string, body: RequestVoteDto) => Promise<RequestVoteResult>} requestVote - Голосвание за нового лидера.
 * @property {(host: string, body: AppendEntriesDto) => Promise<AppendEntriesResult>} heartbeat - Heartbeat лидера.
 */
export interface TransportInterface {
  requestVote(host: string, body: RequestVoteDto): Promise<RequestVoteResult>
  heartbeat(host: string, body: AppendEntriesDto): Promise<AppendEntriesResult>
}
