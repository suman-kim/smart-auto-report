import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailAttachmentDTO } from '../dto/mail-attachment.dto';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  private transporter = nodemailer.createTransport({
    service: 'Gmail', // 또는 smtp 설정
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  async send(fromX:string, to: string, subject: string, bodyText: string,attachments?:MailAttachmentDTO[]): Promise<void> {
    await this.transporter.sendMail({
      from: fromX,
      to:to,
      subject:subject,
      text: bodyText,
      attachments: attachments,
    });

    this.logger.log(`📨 메일 전송 완료 (${to})`);
  }
}