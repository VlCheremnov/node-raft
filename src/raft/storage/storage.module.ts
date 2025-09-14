import { ImMemoryService } from './im-memory.service'
import { Module } from '@nestjs/common'

@Module({
  providers: [
    {
      provide: 'RaftStorage',
      useClass: ImMemoryService, // Можно заменить на RedisStorage
    },
  ],
  exports: ['RaftStorage'],
})
export class StorageModule {}
