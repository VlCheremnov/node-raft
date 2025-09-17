import { TransportInterface } from './transport.interface'
import { RequestVoteDto } from '../dto/request-vote.dto'
import { AppendEntriesDto } from '../dto/append-entries.dto'
import { AppendEntriesResult, RequestVoteResult } from '../types'
import { SetKvDto } from '../dto/set-kv.dto'
import { GetKvDto } from '../dto/get-kv.dto'

/**
 * @class - Реализация транспорта для запросов между нодами на HTTP.
 */
export class HttpTransportService implements TransportInterface {
  /**
   * Отправляет запрос на голосование за лидера.
   * @public
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
   * @public
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
  /**
   * Запрос на создание записи в KV хранилище.
   * @public
   * @param {string} host - Сервис, куда уйдет запрос.
   * @param {SetKvDto} body - Тело запроса.
   * @returns {Promise<boolean>}
   * */
  public async kvSet(host: string, body: SetKvDto): Promise<boolean> {
    return fetch(`${host}/kv/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => res.json() as Promise<boolean>)
  }
  /**
   * Запрос на получение записи из KV хранилища.
   * @public
   * @param {string} host - Сервис, куда уйдет запрос.
   * @param {GetKvDto} body - Тело запроса.
   * @returns {Promise<string>}
   * */
  public async kvGet(host: string, body: GetKvDto): Promise<string> {
    return fetch(`${host}/kv/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => res.json() as Promise<string>)
  }
}
