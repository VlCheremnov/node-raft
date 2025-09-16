import { TransportInterface } from './transport.interface'
import { RequestVoteDto } from '../dto/request-vote.dto'
import { AppendEntriesDto } from '../dto/append-entries.dto'
import { AppendEntriesResult, RequestVoteResult } from '../types'

/**
 * @class - Реализация транспорта для запросов между нодами на HTTP.
 */
export class HttpTransportService implements TransportInterface {
  /**
   * Отправляет запрос на голосование за лидера.
   * @private
   * @param {string} host - Сервис, куда уйдет запрос.
   * @param {RequestVoteDto} body - Тело запроса.
   * @returns {Promise<RequestVoteResult>}
   * */
  public async requestVote(
    host: string,
    body: RequestVoteDto
  ): Promise<RequestVoteResult> {
    return fetch(`${host}/raft/request-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => res.json() as Promise<RequestVoteResult>)
  }
  /**
   * Запрос heartbeat от лидера.
   * @private
   * @param {string} host - Сервис, куда уйдет запрос.
   * @param {AppendEntriesDto} body - Тело запроса.
   * @returns {Promise<AppendEntriesResult>}
   * */
  public async heartbeat(
    host: string,
    body: AppendEntriesDto
  ): Promise<AppendEntriesResult> {
    return fetch(`${host}/raft/append-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => res.json() as Promise<AppendEntriesResult>)
  }
}
