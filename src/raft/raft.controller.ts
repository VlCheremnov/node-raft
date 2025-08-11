import { Body, Controller, Post } from '@nestjs/common'
import { RaftService } from './raft.service'
import { AppendEntriesResult, RequestVoteResult } from './types'
import { RequestVoteDto } from './dto/request-vote.dto'
import { AppendEntriesDto } from './dto/append-entries.dto'

@Controller('raft')
export class RaftController {
  constructor(private raftService: RaftService) {}

  @Post('request-vote')
  requestVote(@Body() params: RequestVoteDto): RequestVoteResult {
    return this.raftService.RequestVote(params)
  }

  @Post('append-entries')
  appendEntries(@Body() params: AppendEntriesDto): AppendEntriesResult {
    return this.raftService.AppendEntries(params)
  }
}
