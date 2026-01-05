import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { UserJwtAuthGuard } from '@/user-auth/guard/user-jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorator/current-user.decorator';
import { StorageService } from '@/common/storage/storage.service';
import { ImageProcessorService } from '@/common/storage/image-processor.service';
import {
  getImageProcessingConfig,
  getOutputMimeType,
} from '@/common/storage/image-processing.config';
import { UploadFileRequestDto } from '@/common/storage/dto/upload-file-request.dto';
import { UploadFileResponseDto } from '@/common/storage/dto/upload-file-response.dto';
import { ForbiddenEntityAccessError } from './domain/forbidden-entity-access.error';
import { InvalidFileMimeTypeError } from './domain/invalid-file-mime-type.error';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(StorageController.name);
  }

  @Post('upload')
  @UseGuards(UserJwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and process a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        entity: { type: 'string', enum: ['users'] },
        entityId: { type: 'string', format: 'uuid' },
        field: { type: 'string', enum: ['avatar'] },
        file: { type: 'string', format: 'binary' },
      },
      required: ['entity', 'entityId', 'field', 'file'],
    },
  })
  @ApiOkResponse({ type: UploadFileResponseDto })
  async uploadFile(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: UploadFileRequestDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadFileResponseDto> {
    const uploadStart = performance.now();

    if (dto.entity === 'users' && dto.entityId !== currentUser.userId) {
      throw new ForbiddenEntityAccessError();
    }

    const config = getImageProcessingConfig(dto.field);

    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new InvalidFileMimeTypeError(file.mimetype, config.allowedMimeTypes);
    }

    const processedBuffer = await this.imageProcessor.processImage(file.buffer, config);

    const outputMimeType = getOutputMimeType(config.format);
    const filename = `${Date.now()}.${config.format}`;

    const result = await this.storageService.uploadFile({
      entity: dto.entity,
      entityId: dto.entityId,
      field: dto.field,
      filename,
      buffer: processedBuffer,
      contentType: outputMimeType,
    });

    const totalDurationMs = performance.now() - uploadStart;
    this.logger.info({
      msg: 'File uploaded',
      entity: dto.entity,
      entityId: dto.entityId,
      field: dto.field,
      originalSize: file.size,
      processedSize: processedBuffer.length,
      totalDurationMs: totalDurationMs.toFixed(2),
    });

    return { path: result.path };
  }
}
