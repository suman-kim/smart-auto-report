import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';
import { AiModel } from '../dto/ai-model.dto';

@Injectable()
export class PersonalNotionService {
  private readonly logger = new Logger(PersonalNotionService.name);
  private readonly notion: Client;
  private readonly databaseId: string;

  constructor(private configService: ConfigService) {
    this.notion = new Client({
      auth: this.configService.get<string>('PERSONAL_NOTION_API_KEY'),
    });
    this.databaseId = this.configService.get<string>('PERSONAL_NOTION_DATABASE_ID');
  }

  async saveToNotion(models: AiModel[]): Promise<void> {
    try {
      this.logger.log(`노션에 ${models.length}개 모델 저장 시작`);

      // 중복 체크 및 저장
      for (const model of models) {
        await this.saveOrUpdateModel(model);
      }

      this.logger.log('노션 저장 완료');
    } catch (error) {
      this.logger.error('노션 저장 중 오류:', error);
      throw error;
    }
  }

  private async saveOrUpdateModel(model: AiModel): Promise<void> {
    try {
      // 중복 체크: 같은 모델명 있는지 확인
      const existingPage = await this.findExistingModel(model.modelName);

      if (existingPage) {
        // 기존 페이지 업데이트
        await this.updateExistingModel(existingPage.id, model);
        this.logger.log(`기존 모델 업데이트: ${model.modelName}`);
      }
      else {
        // 새 페이지 생성
        await this.createNewModel(model);
        this.logger.log(`새 모델 생성: ${model.modelName}`);
      }
    } catch (error) {
      this.logger.error(`모델 저장 실패 ${model.modelName}:`, error);
    }
  }

  private async findExistingModel(modelName: string): Promise<any> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: '모델명',
              title: {
                equals: modelName
              }
            }
          ]
        }
      });

      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      this.logger.warn(`기존 모델 검색 실패: ${modelName}`, error);
      return null;
    }
  }

  private async createNewModel(model: AiModel): Promise<void> {
    const properties = this.buildNotionProperties(model);

    await this.notion.pages.create({
      parent: {
        database_id: this.databaseId
      },
      properties,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `${model.modelName}에 대한 상세 정보입니다.`
                }
              }
            ]
          }
        }
      ]
    });
  }

  private async updateExistingModel(pageId: string, model: AiModel): Promise<void> {
    const properties = this.buildNotionProperties(model);

    await this.notion.pages.update({
      page_id: pageId,
      properties
    });
  }

  private buildNotionProperties(model: AiModel): any {
    return {
      '모델명': {
        title: [
          {
            text: {
              content: model.modelName
            }
          }
        ]
      },
      '개발사': {
        select:{
          name: model.developer
        }
      },
      '출시일': {
        date: {
          start: model.releaseDate
        }
      },
      '모델 유형': {
        multi_select: model.modelType.map(type => ({ name: type.slice(0, 100) }))
      },
      '파라미터 수': {
        rich_text: [
          {
            text: {
              content: model.parameters
            }
          }
        ]
      },
      '주요 특징': {
        rich_text: [
          {
            text: {
              content: model.keyFeatures
            }
          }
        ]
      },
      '사용 사례': {
        multi_select: model.useCases.map(useCase => ({ name: useCase.slice(0, 100) }))
      },
      '모델 URL': {
        url: model.modelUrl || null
      },
      '이미지 URL': {
        url: model.imageUrl || null
      },
      '성능 평가': {
        number: model.performanceRating || 0 // 성능 평가는 숫자로 저장
      },
      '접근성': {
        multi_select: model.accessibility.map(access => ({ name: access.slice(0, 100) }))
      },
      '메모': {
        rich_text: [
          {
            text: {
              content: model.memo || ''
            }
          }
        ]
      },
      '가격': {
        rich_text: [
          {
            text: {
              content: model.pricing
            }
          }
        ]
      },
      '무료 플랜': {
        select:{
          name:model.freePlan
        }
      }
    };
  }

  // 노션 데이터베이스 스키마 자동 생성 (최초 설정용)
  async createDatabase(): Promise<string> {
    try {
      const response = await this.notion.databases.create({
        parent: {
          type: 'page_id',
          page_id: this.configService.get<string>('NOTION_PARENT_PAGE_ID')
        },
        title: [
          {
            type: 'text',
            text: {
              content: 'AI 모델 데이터베이스'
            }
          }
        ],
        properties: {
          '모델명': { title: {} },
          '개발사': { rich_text: {} },
          '출시일': { date: {} },
          '모델 유형': {
            select: {
              options: [
                { name: '텍스트 생성', color: 'blue' },
                { name: '이미지 생성', color: 'green' },
                { name: '음성 인식', color: 'yellow' },
                { name: '비디오 생성', color: 'red' },
                { name: '멀티모달', color: 'purple' },
                { name: '코드 생성', color: 'orange' }
              ]
            }
          },
          '파라미터 수': { rich_text: {} },
          '주요 특징': { multi_select: {} },
          '사용 사례': { multi_select: {} },
          '모델 URL': { url: {} },
          '이미지 URL': { url: {} },
          '성능 평가': { rich_text: {} },
          '접근성': { rich_text: {} },
          '메모': { rich_text: {} },
          '가격 정보': { rich_text: {} },
          '무료 플랜': { checkbox: {} },
          '업데이트 일시': { date: {} }
        }
      });

      this.logger.log(`노션 데이터베이스 생성 완료: ${response.id}`);
      return response.id;
    } catch (error) {
      this.logger.error('노션 데이터베이스 생성 실패:', error);
      throw error;
    }
  }
}