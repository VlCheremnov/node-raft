import { RequestVoteDto } from '../dto/request-vote.dto'
import { AppendEntriesResult, RequestVoteResult } from '../types'
import { AppendEntriesDto } from '../dto/append-entries.dto'
import { SetKvDto } from '../dto/set-kv.dto'
import { GetKvDto } from '../dto/get-kv.dto'

/**
 * Интерфейс транспорта, для обмена данными в RAFT консенсусе.
 * @typedef {Object} TransportInterface
 * @property {(host: string, body: RequestVoteDto) => Promise<RequestVoteResult>} requestVote - Голосвание за нового лидера.
 * @property {(host: string, body: AppendEntriesDto) => Promise<AppendEntriesResult>} heartbeat - Heartbeat лидера.
 * @property {(host: string, body: SetKvDto) => Promise<boolean>} kvSet - Запрос на создание записи в KV хранилище.
 * @property {(host: string, body: GetKvDto) => Promise<string>} kvGet - Запрос на получение записи из KV хранилища.
 */
export interface TransportInterface {
  requestVote(host: string, body: RequestVoteDto): Promise<RequestVoteResult>
  heartbeat(host: string, body: AppendEntriesDto): Promise<AppendEntriesResult>
  kvSet(host: string, body: SetKvDto): Promise<boolean>
  kvGet(host: string, body: GetKvDto): Promise<string>
}
