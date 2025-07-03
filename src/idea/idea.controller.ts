import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdeaService } from './idea.service';
import { IdeaDto } from '../dto/idea.dto';
import { diskStorage, memoryStorage } from 'multer';
import { extname,join } from 'path';
import * as fs from 'fs';


@Controller('idea')
export class IdeaController {
  constructor(private readonly ideaService: IdeaService) {}

  @Post('text')
  async createTextIdea(@Body() createIdeaDto: IdeaDto) {
    try {
      const result = await this.ideaService.createIdeaFromText(createIdeaDto);
      return {
        success: true,
        message: '아이디어가 성공적으로 저장되었습니다.',
        notionPageId: result.id,
      };
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: '아이디어 저장에 실패했습니다.',
        error: error.message,
      });
    }
  }

  @Post('voice')
  @UseInterceptors(FileInterceptor('audio', {
      storage: memoryStorage()
    // storage: diskStorage({
    //   destination: join(process.cwd(), 'uploads'),
    //   filename: (req, file, callback) => {
    //     const uniqueSuffix =
    //       Date.now() + '-' + Math.round(Math.random() * 1e9);
    //     const ext = extname(file.originalname);
    //     const filename = `audio-${uniqueSuffix}${ext}`;
    //     console.log(`파일 저장 예정: ${join(process.cwd(), 'uploads', filename)}`);
    //     callback(null, filename);
    //   },
    // }),
  })
  )
  async createVoiceIdea(@UploadedFile() file: Express.Multer.File, @Body() metadata?:IdeaDto ) {
    if (!file) {
      throw new BadRequestException('음성 파일이 필요합니다.');
    }

    // 파일 정보 로깅 (한글 파일명 디코딩)
    console.log('업로드된 파일:', {
      originalname: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      mimetype: file.mimetype,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      path: file.path,
      exists: require('fs').existsSync(file.path), // 파일 존재 확인
    });

    console.log("음성 아이디어 메타데이터:", metadata);

    // 수동으로 파일 저장
    const filename = `audio-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
    const filepath = join(process.cwd(), 'uploads', filename);

    // 파일 버퍼를 디스크에 저장
    await fs.promises.writeFile(filepath, file.buffer);
    console.log(`파일 저장 성공: ${filepath}`);

    // file 객체에 path 추가 (STT 서비스에서 사용)
    file.path = filepath;


    try {
      const result = await this.ideaService.createIdeaFromVoice(file, metadata);
      return {
        success: true,
        message: '음성 아이디어가 성공적으로 저장되었습니다.',
        transcribedText: result.transcribedText,
        notionPageId: result.notionPageId,
      };
    } catch (error) {
      console.log("음성 아이디어 저장 중 오류:", error);
      throw new BadRequestException({
        success: false,
        message: '음성 아이디어 저장에 실패했습니다.',
        error: error.message,
      });
    }
  }
}