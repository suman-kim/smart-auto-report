import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailAttachmentDTO } from '../dto/mail-attachment.dto';
import { CrawlingResult } from '../dto/ai-model.dto';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  constructor(
    private readonly configService: ConfigService,
  ) {}

  private transporter = nodemailer.createTransport({
    service: 'Gmail', // 또는 smtp 설정
    auth: {
      user: this.configService.get<string>('EMAIL_USER'),
      pass: this.configService.get<string>('EMAIL_PASS'),
    },
  });

  async send(fromX:string,subject: string, bodyText: string,attachments?:MailAttachmentDTO[]): Promise<void> {
    await this.transporter.sendMail({
      from: fromX,
      to:this.configService.get<string>('RECIPIENT_EMAIL'),
      subject:subject,
      text: bodyText,
      attachments: attachments,
    });

    this.logger.log(`📨 메일 전송 완료 (${this.configService.get<string>('RECIPIENT_EMAIL')})`);
  }


  //크롤링 결과 요약 이메일 발송
  async sendSummaryEmail(fromX:string): Promise<void> {
    try {

      const mailOptions = {
        from: fromX,
        to: this.configService.get<string>('RECIPIENT_EMAIL'),
        subject: `🤖[매일 오전 10시] Chat GPT로 최신 AI 모델의 동향을 파악해 보세요!`,
        text: `검색 URL : https://chatgpt.com/g/g-68649240777881918094e7b79dd9a71f-aimodel-bunseoggi?model=gpt-4o`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log('요약 이메일 발송 완료');
    } catch (error) {
      this.logger.error('이메일 발송 실패:', error);
      throw error;
    }
  }
  //크롤링 오류 발생 시 이메일 발송
  async sendErrorEmail(fromX:string,error: any): Promise<void> {
    try {
      const mailOptions = {
        from: fromX,
        to: this.configService.get<string>('RECIPIENT_EMAIL'),
        subject: `❌ AI 모델 크롤링 오류 발생 - ${new Date().toLocaleDateString('ko-KR')}`,
        html: `
          <h2>🚨 AI 모델 크롤링 작업 중 오류 발생</h2>
          <div style="background-color: #ffe6e6; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h3>오류 정보:</h3>
            <p><strong>시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            <p><strong>오류 메시지:</strong> ${error.message}</p>
            <p><strong>스택 트레이스:</strong></p>
            <pre style="background-color: #f5f5f5; padding: 10px; overflow-x: auto;">${error.stack}</pre>
          </div>
          <p>시스템 관리자에게 문의하거나 로그를 확인해주세요.</p>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log('오류 알림 이메일 발송 완료');
    } catch (emailError) {
      this.logger.error('오류 이메일 발송 실패:', emailError);
    }
  }

  //크롤링 결과를 HTML로 변환하여 이메일 본문 생성
  private generateSummaryHTML(result: CrawlingResult): string {
    const models = result.models;
    const date = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI 모델 일일 요약</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 30px; }
                    .summary-box { background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .model-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .model-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                    .model-name { font-size: 1.4em; font-weight: bold; color: #2c3e50; }
                    .developer { color: #7f8c8d; font-size: 0.9em; }
                    .model-type { background-color: #3498db; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8em; }
                    .features-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
                    .feature-tag { background-color: #e8f5e8; color: #2d5a2d; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; }
                    .price-info { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    .free-plan { color: #27ae60; font-weight: bold; }
                    .paid-plan { color: #e74c3c; font-weight: bold; }
                    .url-link { display: inline-block; background-color: #007bff; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; margin: 5px 0; }
                    .url-link:hover { background-color: #0056b3; }
                    .footer { text-align: center; margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-radius: 5px; }
                    .no-models { text-align: center; padding: 40px; color: #7f8c8d; }
                    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
                    .stat-item { text-align: center; }
                    .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
                    .stat-label { font-size: 0.9em; color: #7f8c8d; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🤖 AI 모델 일일 요약</h1>
                    <p>${date}</p>
                </div>
            
                <div class="summary-box">
                    <h2>📊 오늘의 요약</h2>
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-number">${result.totalFound}</div>
                            <div class="stat-label">새로운 모델</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${models.filter(m => m.freePlan).length}</div>
                            <div class="stat-label">무료 플랜</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${new Set(models.map(m => m.developer)).size}</div>
                            <div class="stat-label">개발사 수</div>
                        </div>
                    </div>
                    <p><strong>전체 요약:</strong> ${result.summary}</p>
                </div>
            
                ${models.length === 0 ? `
                    <div class="no-models">
                        <h2>😔 오늘은 새로운 AI 모델이 발견되지 않았습니다</h2>
                        <p>내일 다시 확인해보겠습니다!</p>
                    </div>
                ` : models.map(model => `
                    <div class="model-card">
                        <div class="model-header">
                            <div>
                                <div class="model-name">${model.modelName}</div>
                                <div class="developer">by ${model.developer}</div>
                            </div>
                            <div class="model-type">${model.modelType}</div>
                        </div>
                        
                        <p><strong>📅 출시일:</strong> ${model.releaseDate}</p>
                        <p><strong>⚙️ 파라미터:</strong> ${model.parameters}</p>
                        
                         <p><strong>✨ 주요 특징:</strong></p>
                          <div class="features-list">
                             <span class="feature-tag">${model.keyFeatures}</span>
                          </div>
                        
                        ${model.useCases.length > 0 ? `
                            <p><strong>🎯 사용 사례:</strong> ${model.useCases.join(', ')}</p>
                        ` : ''}
                        
                        <div class="price-info">
                            <p><strong>💰 가격 정보:</strong> ${model.pricing}</p>
                            <p><strong>🆓 무료 플랜:</strong> 
                                <span class="${model.freePlan ? 'free-plan' : 'paid-plan'}">
                                    ${model.freePlan ? '✅ 사용 가능' : '❌ 유료만 제공'}
                                </span>
                            </p>
                        </div>
                        
                        <p><strong>📊 성능 평가:</strong> ${model.performanceRating}</p>
                        <p><strong>🔗 접근성:</strong> ${model.accessibility}</p>
                        
                        ${model.memo ? `<p><strong>📝 메모:</strong> ${model.memo}</p>` : ''}
                        
                        ${model.modelUrl ? `
                            <a href="${model.modelUrl}" class="url-link" target="_blank">🔗 모델 페이지 바로가기</a>
                        ` : ''}
                    </div>
                `).join('')}
            
                <div class="footer">
                    <p>🤖 이 보고서는 자동으로 생성되었습니다.</p>
                    <p>더 자세한 정보는 <a href="${this.configService.get<string>('PERSONAL_NOTION_DATABASE_URL')}" target="_blank">노션 워크스페이스</a>에서 확인하세요.</p>
                    <p><small>크롤링 완료 시간: ${result.crawledAt.toLocaleString('ko-KR')}</small></p>
                </div>
            </body>
            </html>`;
  }
}