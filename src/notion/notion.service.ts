import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotionTaskDto } from '../dto/notion-task.dto';
import axios from 'axios';
import dayjs from '../utils/dayjs.setup';

@Injectable()
export class NotionService {
  private readonly notionToken: string;
  private readonly databaseId: string;
  private readonly notionVersion = '2022-06-28';
  private readonly logger = new Logger(NotionService.name);

  constructor(private readonly configService: ConfigService) {
    this.notionToken = this.configService.get<string>('NOTION_TOKEN');
    this.databaseId = this.configService.get<string>('NOTION_DATABASE_ID');
  }

  async queryDatabase(startDate?:string, endDate?:string, worklogRequired?:boolean): Promise<NotionTaskDto[]> {
    try {
      const body = this.notionRequestBody(worklogRequired);

      const response = await axios.post(
        `https://api.notion.com/v1/databases/${this.databaseId}/query`, body,
        {
          headers: {
            Authorization: `Bearer ${this.notionToken}`,
            'Notion-Version': this.notionVersion,
            'Content-Type': 'application/json',
          },
        },
      );

      const resultList: any[] = response.data.results.map((page) => this.parsePageToDto(page));
      //startDate, endDate로 필터링 startDate와 endDate가 속하는지
      const dateFilteredList = resultList.filter((result) => {
        return this.isDateRangeOverlapping(result.startDate, result.endDate, startDate, endDate);
      });

      return dateFilteredList;
    } catch (error) {
      this.logger.error('Notion DB 조회 실패', error);
      throw new Error('Failed to fetch Notion data');
    }
  }

  //result값 dto 변환
  private parsePageToDto(page: any): NotionTaskDto {
    const props = page.properties;

    return {
      title: props['작업 이름']?.title?.[0]?.plain_text ?? '',
      project: props['프로젝트명']?.select?.name ?? '',
      assignee: props['담당자']?.people?.[0]?.name ?? '',
      description: props['설명']?.rich_text?.[0]?.plain_text ?? '',
      status: props['상태']?.status?.name ?? '',
      startDate: props['시작일']?.date?.start ?? null,
      endDate: props['종료일']?.date?.start ?? null,
      progress: props['진행율']?.number ?? null,
      worklogRequired: props['업무일지 작성']?.select?.name === 'true', // ✅ 여기에 true/false 매핑
      taskType:
        props['작업 유형']?.multi_select?.map((item) => item.name) ?? [],
    };
  }

  //request body 생성
  private notionRequestBody(worklogRequired?: boolean): any {
    const filters = [];

    // 날짜 필터: 시작일 또는 종료일이 범위 안에 있는 항목

    // 업무일지 작성 여부 필터
    if (typeof worklogRequired === 'boolean') {
      filters.push({
        property: '업무일지 작성',
        select: {
          equals: worklogRequired ? 'true' : 'false',
        },
      });
    }

    // 반환 구조
    if (filters.length === 0) {
      return {};
    }

    return filters.length === 1
      ? { filter: filters[0] } // 필터 하나면 단독 적용
      : { filter: { and: filters } }; // 둘 이상이면 and 조건
  }

  private isDateRangeOverlapping(
    startDate: string | null,
    endDate: string | null,
    rangeStart: string,
    rangeEnd: string,
  ): boolean {
    if (!startDate || !endDate) return false;

    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const rangeS = dayjs(rangeStart);
    const rangeE = dayjs(rangeEnd);

    // 종료일이 범위 시작보다 같거나 이후이고, 시작일이 범위 종료보다 같거나 이전이면 겹친다
    return end.isSameOrAfter(rangeS) && start.isSameOrBefore(rangeE);
  }
}

