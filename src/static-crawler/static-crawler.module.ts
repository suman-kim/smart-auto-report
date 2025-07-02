import {Module} from '@nestjs/common';
import {StaticCrawlerService} from './static-crawler.service';

@Module({
  providers: [StaticCrawlerService],
  exports: [StaticCrawlerService], // 다른 모듈에서도 사용 가능하게
})

export class StaticCrawlingModule {}
