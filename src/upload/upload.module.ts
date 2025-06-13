import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { OcrModule } from '../ocr/ocr.module';
import { UploadService } from './upload.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [OcrModule,MailerModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
