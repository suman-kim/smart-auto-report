import { PersonalNotionService } from './personal-notion.service';
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AiModel } from '../dto/ai-model.dto';

@Controller('personal-notion')
export class PersonalNotionController {
  constructor(private readonly personalNotionService: PersonalNotionService) {}

  @Post('create-ai-model')
  async createPage(@Body() aiModelList: AiModel[]) {
    return this.personalNotionService.saveToNotion(aiModelList);
  }
}