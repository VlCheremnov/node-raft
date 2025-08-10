import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { RaftService } from './raft.service'

@Controller('kv')
export class KvController {
  constructor(private raftService: RaftService) {}

  @Post('set')
  set(@Body() body: { key: string; value: string }): { success: boolean } {
    const success = this.raftService.setKey(body.key, body.value)
    return { success }
  }

  @Get(':key')
  get(@Param('key') key: string): { value: string | undefined } {
    return { value: this.raftService.getKey(key) }
  }
}
