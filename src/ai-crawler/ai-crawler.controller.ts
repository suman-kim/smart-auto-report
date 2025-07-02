import { AiCrawlerService } from './ai-crawler.service';
import { Controller, Get, Post } from '@nestjs/common';


@Controller('ai-crawler')
export class AiCrawlerController {
  constructor(
    private readonly aiCrawlerService: AiCrawlerService,
  ) {}

  @Post('run')
  async runManually() {
    await this.aiCrawlerService.runManually();
    return { message: '메일을 발송하였습니다.' };
  }

  @Get('status')
  getStatus() {
    return {
      message: 'AI Crawler 시스템이 정상 작동 중입니다',
      nextRun: '매일 오전 10시',
      timezone: 'Asia/Seoul'
    };
  }
}