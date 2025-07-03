import { Module } from '@nestjs/common';

import { IdeaService } from './idea.service';
import { IdeaController } from './idea.controller';
import { PersonalNotionModule } from '../notion/personal-notion.module';
import { SttModule } from '../stt/stt.module';

@Module({
  imports: [PersonalNotionModule,SttModule],
  controllers: [IdeaController],
  providers: [IdeaService],
  exports: [IdeaService],
})
export class IdeaModule {}
