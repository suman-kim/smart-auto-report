import { Module } from '@nestjs/common';
import { PersonalNotionController } from './personal-notion-controller';
import { PersonalNotionService } from './personal-notion.service';

@Module({
  imports: [],
  providers:[PersonalNotionService],
  controllers: [PersonalNotionController],
  exports: [PersonalNotionService], // 다른 모듈에서도 사용 가능하게
})

export class PersonalNotionModule {
}
