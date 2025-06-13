import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { TaskService } from './task.service';
import { NotionTaskDto } from '../dto/notion-task.dto';


@Controller('task')
export class TaskController {
  constructor(private readonly taskService:TaskService) {
  }

  @Post()
  async createAndSendEmail():Promise<NotionTaskDto[]>{
    return this.taskService.createAndSendEmail();
  }
}