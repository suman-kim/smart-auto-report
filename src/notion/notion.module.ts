import { Module } from '@nestjs/common';
import { NotionService } from './notion.service';

@Module({
  providers: [NotionService],
  exports: [NotionService], // 👈 다른 모듈에서도 사용 가능하게
})
export class NotionModule {}