import { Module } from '@nestjs/common'
import { RaftService } from './raft.service'
import { RaftController } from './raft.controller'
import { KvController } from './kv.controller'
import { ConfigService } from '@nestjs/config'

@Module({
  providers: [RaftService, ConfigService],
  controllers: [RaftController, KvController],
  exports: [RaftService],
})
export class RaftModule {}
