import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
// Node.js 버전 호환성을 위한 File polyfill
if (typeof globalThis.File === 'undefined') {
  globalThis.File = require('node:buffer').File;
}

@Injectable()
export class SttService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async transcribeAudio(file: Express.Multer.File): Promise<string> {
    try {
      console.log(`Transcribing audio file: ${file.originalname}`);
      console.log(`File path: ${file.path}`);
      // OpenAI Whisper API 사용
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(file.path),
        model: 'gpt-4o-transcribe',
        language: 'ko', // 한국어 설정
        response_format: 'text',
      });

      console.log(`Transcription result: ${transcription}`);

      // 임시 파일 삭제
      fs.unlinkSync(file.path);

      return transcription;
    } catch (error) {
      console.log(`Transcription error: ${error.message}`);
      // 파일 정리
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new Error(`음성 인식 실패: ${error.message}`);
    }
  }

  // 대안: Google Speech-to-Text 사용
  async transcribeWithGoogle(file: Express.Multer.File): Promise<string> {
    const speech = require('@google-cloud/speech');
    const client = new speech.SpeechClient();

    try {
      const audioBytes = fs.readFileSync(file.path);

      const request = {
        audio: {
          content: audioBytes.toString('base64'),
        },
        config: {
          encoding: 'WEBM_OPUS', // 또는 파일 형식에 맞게 설정
          sampleRateHertz: 16000,
          languageCode: 'ko-KR',
        },
      };

      const [response] = await client.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      fs.unlinkSync(file.path);
      return transcription;
    } catch (error) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new Error(`음성 인식 실패: ${error.message}`);
    }
  }
}