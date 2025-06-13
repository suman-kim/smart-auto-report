import * as vision from '@google-cloud/vision';
import * as path from 'path';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OcrService {
  private client: vision.ImageAnnotatorClient;

  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: path.resolve(process.cwd(), 'secrets/google-cloud-credentials.json'),
    });
  }

  async extractText(imagePath: string): Promise<string> {
    const [result] = await this.client.textDetection(imagePath);
    const detections = result.textAnnotations;
    return detections?.[0]?.description || '';
  }
}