import { Module } from '@nestjs/common';
import { IpMonitorService } from './ip-monitor.service';
import { IpMonitorController } from './ip-monitor.controller';
import { MailerModule } from '../mailer/mailer.module'; // 기존 메일러 모듈

@Module({
  imports: [MailerModule],
  controllers: [IpMonitorController],
  providers: [IpMonitorService],
  exports: [IpMonitorService],
})
export class IpMonitorModule {}