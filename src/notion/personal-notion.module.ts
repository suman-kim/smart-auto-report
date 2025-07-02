import { Module } from '@nestjs/common';
import { PersonalNotionController } from './personal-notion-controller';
import { PersonalNotionService } from './personal-notion.service';

@Module({
  imports: [],
  providers:[PersonalNotionService],
  controllers: [PersonalNotionController],
})

export class PersonalNotionModule {
}
