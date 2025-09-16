import { Module } from '@nestjs/common'
import { HttpTransportService } from './http-transport.service'

@Module({
  providers: [
    {
      provide: 'RaftTransport',
      useClass: HttpTransportService,
    },
  ],
  exports: ['RaftTransport'],
})
export class RaftTransport {}
