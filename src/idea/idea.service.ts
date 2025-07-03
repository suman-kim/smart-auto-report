import { Injectable } from '@nestjs/common';
import { PersonalNotionService } from '../notion/personal-notion.service';
import { SttService } from '../stt/stt.service';
import { IdeaDto } from '../dto/idea.dto';

@Injectable()
export class IdeaService {
  constructor(
    private readonly personalNotionService: PersonalNotionService,
    private readonly sttService: SttService,
  ) {}

  async createIdeaFromText(ideaDto: IdeaDto) {
    const ideaData:IdeaDto = {
      content: ideaDto.content,
      status: ideaDto.status || '미검토',
      location: ideaDto.location || '',
      keywords: ideaDto.keywords || [],
      createdAt: new Date().toISOString(),
    };

    return await this.personalNotionService.createIdea(ideaData);
  }

  async createIdeaFromVoice(file: Express.Multer.File, ideaDto:IdeaDto) {
    // 음성을 텍스트로 변환
    const transcribedText = await this.sttService.transcribeAudio(file);

    const ideaData:IdeaDto = {
      content: transcribedText,
      status: ideaDto?.status || '미검토',
      location: ideaDto?.location || '',
      keywords: ideaDto?.keywords || [],
      createdAt: new Date().toISOString(),
    };

    const notionResult = await this.personalNotionService.createIdea(ideaData);

    return {
      transcribedText,
      notionPageId: notionResult.id,
    };
  }
}