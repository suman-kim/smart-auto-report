import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';

@Module({
  providers: [OcrService],
  exports: [OcrService], // 👈 다른 모듈에서도 사용 가능하게
})
export class OcrModule {}