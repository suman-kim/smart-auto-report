import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@notionhq/client';
import { AiModel } from '../dto/ai-model.dto';
import { IdeaDto } from '../dto/idea.dto';

@Injectable()
export class PersonalNotionService {
  private readonly logger = new Logger(PersonalNotionService.name);
  private readonly notion: Client;
  // AI 모델 갤러리 데이터베이스 ID
  private readonly databaseId: string;
  // 생각 정리 & 아이디어 저장용 데이터베이스 ID
  private readonly ideaDatabaseId: string;

  constructor(private configService: ConfigService) {
    this.notion = new Client({
      auth: this.configService.get<string>('PERSONAL_NOTION_API_KEY'),
    });
    this.databaseId = this.configService.get<string>('PERSONAL_NOTION_DATABASE_ID');
    this.ideaDatabaseId = this.configService.get<string>('PERSONAL_NOTION_IDEA_DATABASE_ID');
  }

  /**
   * AI 모델 정보를 노션에 저장합니다.
   * @param models - 저장할 AI 모델 정보 배열
   */
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

  /**
   * AI 모델 정보를 노션에 저장하거나 업데이트합니다.
   * @param model - 저장할 AI 모델 정보
   */
  private async saveOrUpdateModel(model: AiModel): Promise<void> {
    try {
      // 중복 체크: 같은 모델명 있는지 확인
      const existingPage = await this.findExistingModel(model.modelName);

      if (existingPage) {
        // 기존 페이지 업데이트
        await this.updateExistingModel(existingPage.id, model);
        this.logger.log(`기존 모델 업데이트: ${model.modelName}`);
      } else {
        // 새 페이지 생성
        await this.createNewModel(model);
        this.logger.log(`새 모델 생성: ${model.modelName}`);
      }
    } catch (error) {
      this.logger.error(`모델 저장 실패 ${model.modelName}:`, error);
    }
  }

  /**
   * 노션 데이터베이스에서 기존 AI 모델을 검색합니다.
   * @param modelName - 검색할 모델명
   * @returns 기존 모델 페이지 정보 또는 null
   */
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

  /**
   * AI 모델 정보를 노션에 새 페이지로 생성합니다.
   * @param model - 생성할 AI 모델 정보
   */
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

  /**
   * 기존 AI 모델 정보를 노션 페이지로 업데이트합니다.
   * @param pageId - 업데이트할 페이지 ID
   * @param model - 업데이트할 AI 모델 정보
   */
  private async updateExistingModel(pageId: string, model: AiModel): Promise<void> {
    const properties = this.buildNotionProperties(model);

    await this.notion.pages.update({
      page_id: pageId,
      properties
    });
  }

  /**
   * AI 모델 정보를 노션 페이지 속성으로 변환합니다.
   * @param model - AI 모델 정보
   * @returns 노션 페이지 속성 객체
   */
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
        select: {
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
        select: {
          name: model.freePlan
        }
      }
    };
  }

  /**
   * 생각 정리 및 아이디어 저장용 데이터베이스에 아이디어를 생성합니다.
   * @param ideaData - 아이디어 데이터
   * @returns 생성된 페이지 정보
   */
  async createIdea(ideaData: IdeaDto) {
    try {

      const properties = this.buildIdeaProperties(ideaData);
      // 아이디어 데이터 유효성 검사
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.ideaDatabaseId,
        },
        properties,
      });

      this.logger.log(`아이디어 저장 성공: ${ideaData.content.substring(0, 20)}...`);
      return response;
    } catch (error) {
      throw new Error(`노션 저장 실패: ${error.message}`);
    }
  }


  private buildIdeaProperties(ideaData: IdeaDto) {

    return {
      // 제목 (아이디어 내용의 첫 50자)
      '제목': {
        title: [
          {
            text: {
              content: ideaData.content.substring(0, 10)
            },
          },
        ],
      },
      '내용':{
        rich_text: [
          {
            text: {
              content: ideaData.content,
            },
          },
        ],
      },
      // 진행상태
      '진행상태': {
        status: {
          name: ideaData.status,
        },
      },
      // 위치
      '위치': {
        rich_text: [
          {
            text: {
              content: ideaData.location,
            },
          },
        ],
      },
      // 키워드
      '키워드': {
        multi_select: ideaData.keywords.map(keyword => ({ name: keyword })),
      },
      // 생성일 (텍스트 형식)
      '생성일': {
        date: {
          start: ideaData.createdAt,
        },
      }
    }
  }
}