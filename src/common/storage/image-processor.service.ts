import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';
import { ImageProcessingConfig } from './image-processing.config';

@Injectable()
export class ImageProcessorService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ImageProcessorService.name);
  }

  async processImage(input: Buffer, config: ImageProcessingConfig): Promise<Buffer> {
    const startTime = performance.now();

    let pipeline = sharp(input).resize({
      width: config.maxWidth,
      height: config.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });

    switch (config.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: config.quality, mozjpeg: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: config.quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: config.quality });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();

    const durationMs = performance.now() - startTime;
    this.logger.info({
      msg: 'Image processed',
      inputSizeBytes: input.length,
      outputSizeBytes: outputBuffer.length,
      compressionRatio: (input.length / outputBuffer.length).toFixed(2),
      durationMs: durationMs.toFixed(2),
      format: config.format,
      maxDimensions: `${config.maxWidth}x${config.maxHeight}`,
    });

    return outputBuffer;
  }
}
