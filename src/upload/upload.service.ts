import { Injectable } from '@nestjs/common';
import { OcrService } from 'src/ocr/ocr.service';
import { Express } from 'express';
import { MailerService } from '../mailer/mailer.service';
import { MailAttachmentDTO } from '../dto/mail-attachment.dto';

@Injectable()
export class UploadService {
  constructor(private readonly ocrService: OcrService,
              private readonly mailerService: MailerService) {}

  async processUploadedFile(file: Express.Multer.File) {
    const filePath = file.path;
    const text = await this.ocrService.extractText(filePath);

    console.log('📷 원본 이름:', file.originalname); // 예: IMG_1234.HEIC
    console.log('📥 저장된 이름:', file.filename);    // 예: photo-1718082123123.heic
    console.log('📁 저장 경로:', file.path);          // 예: uploads/photo-1718082123123.heic
    console.log('📝 OCR 검출 결과:', text);


    //메일 발송
    const fromX = '"OCR 시스템" <noreply@example.com>';
    const to = 'zzsdsdsd@focusai.co.kr';
    const subject = `[OCR 결과] ${file.originalname}`;
    const body = `📷 파일 이름: ${file.originalname}\n📝 OCR 내용:\n\n${text}`;
    const attachments:MailAttachmentDTO[] = [{
      filename: file.originalname,
      path: file.path,
      contentType: 'image/jpeg',
    }];
    await this.mailerService.send(fromX,to,subject,body,attachments);


    return {
      message: '파일 업로드 성공',
      filename: file.filename,
      size: file.size,
      ocrText: text,
    };
  }
}