import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { MailerService} from '../mailer/mailer.service';

@Injectable()
export class NgrokMonitorService implements OnModuleInit {
  private readonly logger = new Logger(NgrokMonitorService.name);
  private readonly urlFilePath = path.join(__dirname, '../../ngrok-url.txt');

  constructor(private readonly emailService: MailerService) {}

  async onModuleInit() {
    await this.monitorNgrokUrl(); // 최초 1회 실행
  }

  //3시간마다
  @Cron(CronExpression.EVERY_3_HOURS)
  async handleCron() {
    await this.monitorNgrokUrl(); // 주기적 실행
  }

  async monitorNgrokUrl() {
    try {
      const savedUrl = this.readSavedUrl();
      const currentUrl = await this.getNgrokUrl();

      if (currentUrl && currentUrl !== savedUrl) {
        this.logger.log(`🔄 URL 변경 감지됨: ${savedUrl} → ${currentUrl}`);

        const fromX = "Ngrok URL 변경 감지";
        const to = 'zzsdsdsd@focusai.co.kr';
        const subject = `Ngrok URL 새 URL: ${currentUrl}/upload`;
        const text = `Ngrok URL 변경 감지: ${savedUrl}/upload → ${currentUrl}/upload`;

        try {
          await this.emailService.send(fromX, to, subject, text);
        } catch (mailErr) {
          this.logger.error('📨 이메일 전송 실패', mailErr);
        }

        this.saveCurrentUrl(currentUrl);
      } else {
        this.logger.log('✅ URL 변경 없음');
      }
    } catch (error) {
      this.logger.error('❌ ngrok URL 확인 실패', error);
    }
  }

  private async getNgrokUrl(): Promise<string | null> {
    try {
      const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
      const tunnels = response.data.tunnels;
      const httpsTunnel = tunnels.find(t => t.public_url.startsWith('https://'));
      return httpsTunnel?.public_url ?? null;
    } catch (error) {
      //4040포트 연결 불가 메일 전송
      const fromX = "❌ ngrok에 접근 실패";
      const to = 'zzsdsdsd@focusai.co.kr';
      const subject = `Ngrok 4040포트 연결 불가`;
      const text = `Ngrok 4040포트 연결 불가`;

      try {
        await this.emailService.send(fromX, to, subject, text);
      } catch (mailErr) {
        this.logger.error('📨 이메일 전송 실패', mailErr);
      }

      this.logger.error('❌ ngrok에 접근 실패 (4040포트 연결 불가)', error.message);
      return null;
    }
  }

  private readSavedUrl(): string {
    try {
      return fs.existsSync(this.urlFilePath)
        ? fs.readFileSync(this.urlFilePath, 'utf-8').trim()
        : '';
    } catch {
      return '';
    }
  }

  private saveCurrentUrl(url: string) {
    fs.writeFileSync(this.urlFilePath, url, 'utf-8');
  }
}