import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as crypto from 'crypto';

// Node.js v22+ 호환성을 위한 crypto 설정
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: crypto,
    writable: false,
    configurable: false
  });
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 5555);
}

bootstrap();
