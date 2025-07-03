import { Module } from '@nestjs/common';
import { SttService } from './stt.service';

@Module({
  exports: [SttService],
  providers: [SttService],
})

export class SttModule {}
