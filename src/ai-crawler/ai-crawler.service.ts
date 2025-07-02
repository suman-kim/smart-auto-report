import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StaticCrawlerService } from '../static-crawler/static-crawler.service'
import { OpenAIService } from '../openai/openai.service';
import { PersonalNotionService } from '../notion/personal-notion.service';
import { MailerService } from  '../mailer/mailer.service';

@Injectable()
export class AiCrawlerService {
  private readonly logger = new Logger(AiCrawlerService.name);

  constructor(
    private readonly staticCrawlerService: StaticCrawlerService,
    private readonly openaiService: OpenAIService,
    private readonly notionService: PersonalNotionService,
    private readonly emailService: MailerService,
  ) {}

  @Cron('0 10 * * *') // 매일 오전 10시
  async performDailyCrawling() {
    try {


      // 1. 웹 크롤링으로 원시 데이터 수집
      // const rawData = await this.staticCrawlerService.crawlAiModels();
      // this.logger.log(`📊 원시 데이터 ${rawData.length}개 수집 완료`);
      //
      // // 2. OpenAI로 데이터 분석 및 정리
      // const analysisResult = await this.openaiService.analyzeAiModels(rawData);
      // this.logger.log(`🤖 AI 분석 완료: ${analysisResult.models.length}개 모델 정리`);
      //
      // // 3. 노션에 데이터 저장
      // await this.notionService.saveToNotion(analysisResult.models);
      // this.logger.log('📝 노션 저장 완료');
      //
      //
       const fromX = "최신 AI 모델을 검색해 보세요!";

      // 4. 이메일로 요약 발송
      await this.emailService.sendSummaryEmail(fromX);
      this.logger.log('📧 CHAT GPT AI 모델 검색 일정 이메일 발송 완료');

      // this.logger.log('✅ 매일 AI 모델 크롤링 작업 완료');
    }
    catch (error) {

      const fromX = "최신 AI 모델을 검색해 보세요! 오류";

      this.logger.error('❌ 최신 AI 모델을 검색해 보세요!:', error);
      await this.emailService.sendErrorEmail(fromX,error);
    }
  }

  // 수동 실행용 (테스트)
  async runManually() {
    this.logger.log('🔧 최신 AI 모델을 검색해 보세요!');
    await this.performDailyCrawling();
  }
}