import { Module } from '@nestjs/common';
import { AiCrawlerService } from './ai-crawler.service';
import { StaticCrawlerService } from '../static-crawler/static-crawler.service';
import { OpenAIService } from '../openai/openai.service';
import { PersonalNotionService } from '../notion/personal-notion.service';
import { MailerService } from '../mailer/mailer.service';
import { AiCrawlerController } from './ai-crawler.controller';

@Module({
  providers: [
    AiCrawlerService,
    StaticCrawlerService,
    OpenAIService,
    PersonalNotionService,
    MailerService,
  ],
  controllers:[AiCrawlerController]
})
export class AiCrawlerModule {}