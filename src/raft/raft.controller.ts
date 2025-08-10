import { Body, Controller, Post } from '@nestjs/common'
import { RaftService } from './raft.service'
import {
  AppendEntriesParams,
  AppendEntriesResult,
  RequestVoteParams,
  RequestVoteResult,
} from './types'

@Controller('raft')
export class RaftController {
  constructor(private raftService: RaftService) {}

  @Post('request-vote')
  requestVote(@Body() params: RequestVoteParams): RequestVoteResult {
    return this.raftService.RequestVote(params)
  }

  @Post('append-entries')
  appendEntries(@Body() params: AppendEntriesParams): AppendEntriesResult {
    return this.raftService.AppendEntries(params)
  }
}
