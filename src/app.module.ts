import { Module } from '@nestjs/common'
import { RaftModule } from './raft/raft.module'

@Module({
  imports: [RaftModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
