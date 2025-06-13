import { Module } from '@nestjs/common';
import { NgrokMonitorService } from './ngrok-monitor.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports:[MailerModule],
  providers: [NgrokMonitorService],
  exports: [NgrokMonitorService],
})
export class NgrokMonitorModule {}