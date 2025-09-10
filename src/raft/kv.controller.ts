import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { RaftService } from './raft.service'
import { GetKvDto } from './dto/get-kv.dto'
import { SetKvDto } from './dto/set-kv.dto'

@Controller('kv')
export class KvController {
  constructor(private raftService: RaftService) {}

  @HttpCode(HttpStatus.OK)
  @Post('set')
  set(@Body() body: SetKvDto): { success: boolean } {
    const success = this.raftService.setValue(body.key, body.value)
    return { success }
  }

  @HttpCode(HttpStatus.OK)
  @Post('get')
  get(@Body() body: GetKvDto): { value: string | undefined } {
    return { value: this.raftService.getValue(body.key) }
  }
}
