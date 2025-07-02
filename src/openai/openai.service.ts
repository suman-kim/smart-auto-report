import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiModel, CrawlingResult } from '../dto/ai-model.dto';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeAiModels(rawData: string[]): Promise<CrawlingResult> {
    try {
      const prompt = this.buildAnalysisPrompt(rawData);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `당신은 AI 모델 전문 분석가입니다. 제공된 웹 크롤링 데이터를 분석하여 최신 AI 모델 정보를 정확하고 구조화된 형태로 정리해주세요.
                      중요한 가이드라인:
                      1. 2024년 12월 이후 출시되거나 발표된 AI 모델만 포함
                      2. 중복 제거: 같은 모델이 여러 소스에서 언급된 경우 하나로 통합
                      3. 정확한 정보만 포함: 불확실한 정보는 "정보 부족" 또는 "확인 필요"로 표시
                      4. 반드시 JSON 형식으로 응답
                      5. 무료 플랜 여부는 명확히 조사하여 true/false로 표시`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const responseContent = completion.choices[0].message.content;
      const parsedResult = this.parseOpenAIResponse(responseContent);

      this.logger.log(`OpenAI 분석 완료: ${parsedResult.models.length}개 모델 식별`);
      return parsedResult;

    } catch (error) {
      this.logger.error('OpenAI 분석 중 오류:', error);
      throw new Error(`OpenAI 분석 실패: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(rawData: string[]): string {
    const combinedData = rawData.join('\n\n');

    return `
            # 📌 매일 오전 10시에 AI 모델 정보를 정리하는 작업
            
            ## ✅ 작업 개요
            매일 오전 10시에 인터넷(구글, 네이버 등)을 검색하고 크롤링하여 최근 출시된 모든 AI 모델 정보를 수집하고 분석하여 나에게 제공한다.
            
            ---
            
            ## 📌 수집 대상
            - 최신 출시된 AI 모델 (개발, 디자인 등 분야 제한 없음)
            
            ---
            
            ## 📌 반드시 포함할 정보
            - 모델명
            - 개발사
            - 출시일
            - 모델 유형 (예: 텍스트 생성, 이미지 생성, 음성 인식 등)
            - 파라미터 수
            - 주요 특징
            - 사용 사례
            - 모델 URL (바로 접속 가능해야 함)
            - 이미지 (모델 관련 대표 이미지 URL 등)
            - 성능 평가
            - 접근성 (예: API 지원 여부, 사용하기 쉬움 등)
            - 메모 (추가 설명이나 참고사항)
            - 가격 & 무료 플랜 여부 (무료플랜 존재 여부 명확히 표기)
            
            ---
            
            ## 📌 결과물 형태
            결과는 아래 **두 가지 형태**로 제공한다:
            
            ### ① 노션 API로 바로 데이터를 생성할수 있게 JSON 형식
            ### ② 즉시 상세하게 볼 수 있는 요약 정리
            
            ---
            
            ## ✅ 이 작업의 목적
            - 최신 AI 기술 트렌드를 놓치지 않고 매일 파악
            - 모든 정보를 한 번에 노션에 정리하고 효율적으로 관리
            
            ---
            
            # 분석할 크롤링 데이터:
            
            ${combinedData}
            
            ---
            
            위 데이터를 분석하여 다음 JSON 형식으로 응답해주세요:
            
            {
              "models": [
                {
                  "modelName": "모델명",
                  "developer": "개발사",
                  "releaseDate": "YYYY-MM-DD",
                  "modelType": "모델 유형",
                  "parameters": "파라미터 수",
                  "keyFeatures": ["특징1", "특징2", "특징3"],
                  "useCases": ["용도1", "용도2"],
                  "modelUrl": "모델 접속 URL",
                  "imageUrl": "대표 이미지 URL",
                  "performanceRating": "성능 평가",
                  "accessibility": "접근성 설명",
                  "memo": "추가 메모",
                  "pricing": "가격 정보",
                  "freePlan": true/false
                }
              ],
              "summary": "오늘 수집된 AI 모델들의 전반적인 요약",
              "totalFound": 숫자,
              "crawledAt": "현재 시간"
            }
            `;
  }

  private parseOpenAIResponse(responseContent: string): CrawlingResult {
    try {
      // JSON 부분만 추출
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON 형식을 찾을 수 없습니다');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // 데이터 검증 및 정제
      const validatedModels: AiModel[] = parsed.models
        .filter((model: any) => model.modelName && model.developer)
        .map((model: any) => ({
          modelName: model.modelName || 'Unknown',
          developer: model.developer || 'Unknown',
          releaseDate: model.releaseDate || new Date().toISOString().split('T')[0],
          modelType: model.modelType || 'Unknown',
          parameters: model.parameters || '정보 부족',
          keyFeatures: Array.isArray(model.keyFeatures) ? model.keyFeatures : [],
          useCases: Array.isArray(model.useCases) ? model.useCases : [],
          modelUrl: model.modelUrl || '',
          imageUrl: model.imageUrl || '',
          performanceRating: model.performanceRating || '평가 대기',
          accessibility: model.accessibility || '정보 부족',
          memo: model.memo || '',
          pricing: model.pricing || '정보 부족',
          freePlan: Boolean(model.freePlan)
        }));

      return {
        models: validatedModels,
        summary: parsed.summary || '요약 정보가 없습니다',
        totalFound: validatedModels.length,
        crawledAt: new Date()
      };

    } catch (error) {
      this.logger.error('OpenAI 응답 파싱 실패:', error);

      // 파싱 실패 시 빈 결과 반환
      return {
        models: [],
        summary: 'OpenAI 응답 파싱에 실패했습니다',
        totalFound: 0,
        crawledAt: new Date()
      };
    }
  }
}