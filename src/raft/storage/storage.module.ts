import { Module } from '@nestjs/common'
import { InMemoryService } from './in-memory.service'

@Module({
  providers: [
    {
      provide: 'RaftStorage',
      useClass: InMemoryService, // Можно заменить на RedisStorage
    },
  ],
  exports: ['RaftStorage'],
})
export class StorageModule {}
