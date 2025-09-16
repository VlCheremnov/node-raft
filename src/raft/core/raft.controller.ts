import { Body, Controller, HttpException, Post } from '@nestjs/common'
import { RaftService } from './raft.service'
import { AppendEntriesResult, RequestVoteResult } from './../types'
import { RequestVoteDto } from './../dto/request-vote.dto'
import { AppendEntriesDto } from './../dto/append-entries.dto'

/**
 * @class Контроллер для обработки RAFT-запросов.
 */
@Controller('raft')
export class RaftController {
  constructor(
    /**
     * Сервис для обработки RAFT-логики.
     * @private
     * @type {RaftService}
     */
    private raftService: RaftService
  ) {}

  /**
   * Обрабатывает запрос RequestVote (Запрашивает голос для выбора лидера).
   * @http {POST} /raft/request-vote
   * @param {RequestVoteDto} params - Параметры запроса.
   * @returns {RequestVoteResult} Результат обработки запроса.
   * @throws {HttpException} Если запрос некорректен (например, неверный term).
   * @example
   * POST /raft/request-vote
   * Body: {
   *   "term": 2,
   *   "candidateId": 3,
   *   "lastLogIndex": 2,
   *   "lastLogTerm": 1,
   * }
   * Response: {
   *   "term": 1
   *   "voteGranted": true
   * }
   */
  @Post('request-vote')
  RequestVote(@Body() params: RequestVoteDto): RequestVoteResult {
    return this.raftService.RequestVote(params)
  }

  /**
   * Обрабатывает запрос AppendEntries (heartbeat или добавление записей).
   * @http {POST} /raft/append-entries
   * @param {AppendEntriesDto} params - Параметры запроса.
   * @returns {AppendEntriesResult} Результат обработки запроса.
   * @throws {HttpException} Если запрос некорректен (например, неверный term).
   * @example
   * POST /raft/append-entries
   * Body: {
   *   "term": 1,
   *   "leaderId": 1,
   *   "prevLogIndex": 1,
   *   "prevLogTerm": 1,
   *   "leaderCommit": 0,
   *   "entries": [
   *     {
   *       "index": 2,
   *       "term": 1,
   *       "command": { "key": "key", "value": "value" }
   *     }
   *   ]
   * }
   * Response: {
   *   "term": 1
   *   "success": true
   * }
   */
  @Post('append-entries')
  AppendEntries(@Body() params: AppendEntriesDto): AppendEntriesResult {
    return this.raftService.AppendEntries(params)
  }
}
