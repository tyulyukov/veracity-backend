import { Inject, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfigService } from '@/common/config/config.service';
import { buildStoragePath } from './storage-path.builder';
import {
  GenerateUploadUrlParams,
  UploadUrlResult,
  StorageProvider,
  STORAGE_PROVIDER,
} from './storage.interface';

const PRESIGNED_URL_EXPIRES_IN_SECONDS = 300;

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

  async generateUploadUrl(params: GenerateUploadUrlParams): Promise<UploadUrlResult> {
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
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
      signableHeaders: new Set(['content-type']),
    });

    const publicUrl = `${this.config.r2.publicUrl}/${key}`;

    return { uploadUrl, publicUrl };
  }
}

@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  async generateUploadUrl(params: GenerateUploadUrlParams): Promise<UploadUrlResult> {
    return this.provider.generateUploadUrl(params);
  }
}
