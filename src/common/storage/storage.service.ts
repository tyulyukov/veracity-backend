import { Inject, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AppConfigService } from '@/common/config/config.service';
import { buildStoragePath } from './storage-path.builder';
import {
  UploadFileParams,
  UploadFileResult,
  StorageProvider,
  STORAGE_PROVIDER,
} from './storage.interface';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly s3Client: S3Client;

  constructor(private readonly config: AppConfigService) {
    const r2Config = this.config.r2;
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Config.apiUrl,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    });
  }

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    const key = buildStoragePath({
      env: this.config.app.nodeEnv,
      entity: params.entity,
      entityId: params.entityId,
      field: params.field,
      filename: params.filename,
    });

    const command = new PutObjectCommand({
      Bucket: this.config.r2.bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
    });

    await this.s3Client.send(command);

    return { path: key };
  }
}

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    return this.provider.uploadFile(params);
  }
}
