import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UploadModule } from './upload/upload.module';
import { NotionModule } from './notion/notion.module';
import { ConfigModule } from '@nestjs/config';
import { TaskModule } from './task/task.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from './mailer/mailer.module';
import { NgrokMonitorModule } from './ngrokMonitor/ngrok-monitor.module';
import { OpenAIModule } from './openai/openai.module';
import { AiCrawlerController } from './ai-crawler/ai-crawler.controller';
import { AiCrawlerModule } from './ai-crawler/ai-crawler.module';
import { PersonalNotionModule } from './notion/personal-notion.module';
@Module({
  imports: [UploadModule,
    NotionModule,
    TaskModule,
    MailerModule,
    NgrokMonitorModule,
    ScheduleModule.forRoot(),
    OpenAIModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AiCrawlerModule,
    PersonalNotionModule], // .env 자동 로드

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
