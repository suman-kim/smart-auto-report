import { TaskController } from './task.controller';
import { NotionModule } from '../notion/notion.module';
import { TaskService } from './task.service';
import { Module } from '@nestjs/common';
import { TaskSchedulerService } from './task-scheduler.service';
import { SheetModule } from '../sheet/sheet.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [NotionModule,SheetModule,MailerModule],
  controllers: [TaskController],
  providers: [TaskService, TaskSchedulerService],
})

export class TaskModule {}