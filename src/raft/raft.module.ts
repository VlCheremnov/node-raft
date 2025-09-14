import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RaftService } from './core/raft.service'
import { RaftController } from './core/raft.controller'
import { KvController } from './core/kv.controller'
import { StorageModule } from './storage/storage.module'

@Module({
  imports: [StorageModule],
  providers: [ConfigService, RaftService],
  controllers: [RaftController, KvController],
  exports: [RaftService],
})
export class RaftModule {}
