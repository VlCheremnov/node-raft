import { Module } from '@nestjs/common'
import { InMemoryService } from './in-memory.service'

@Module({
  providers: [
    {
      provide: 'RaftStorage',
      useClass: InMemoryService,
    },
  ],
  exports: ['RaftStorage'],
})
export class StorageModule {}
