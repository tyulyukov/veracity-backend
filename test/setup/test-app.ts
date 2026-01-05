import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from '@/common/const/app.const';
import { EMAIL_PROVIDER, EmailProvider } from '@/common/email/email.interface';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  GenerateUploadUrlParams,
  UploadUrlResult,
} from '@/common/storage/storage.interface';
import { runMigrations } from './run-migrations';

let container: StartedPostgreSqlContainer;
let app: INestApplication;

export const mockEmailProvider: EmailProvider & {
  sentEmails: Array<{ to: string; subject: string; html: string }>;
} = {
  sentEmails: [],
  async send(options) {
    this.sentEmails.push(options);
  },
};

export const mockStorageProvider: StorageProvider & {
  uploadRequests: GenerateUploadUrlParams[];
} = {
  uploadRequests: [],
  async generateUploadUrl(params: GenerateUploadUrlParams): Promise<UploadUrlResult> {
    this.uploadRequests.push(params);
    const key = `local/${params.entity}/${params.entityId}/${params.field}/${params.filename}`;
    return {
      uploadUrl: `https://test.r2.cloudflarestorage.com/veracity-test/${key}?X-Amz-Signature=mock`,
      publicUrl: `https://storage.test.com/${key}`,
    };
  },
};

export async function setupTestApp(): Promise<INestApplication> {
  container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('veracity_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const databaseUrl = `postgres://postgres:postgres@${container.getHost()}:${container.getPort()}/veracity_test`;

  const testEnv = {
    NODE_ENV: 'local',
    PORT: '8008',
    POSTGRES_HOST: container.getHost(),
    POSTGRES_PORT: container.getPort().toString(),
    POSTGRES_USERNAME: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
    POSTGRES_DATABASE: 'veracity_test',
    POSTGRES_LOGGING: 'false',
    USER_JWT_SECRET: 'test-user-jwt-secret',
    USER_JWT_EXPIRES_IN: '7d',
    ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
    ADMIN_JWT_EXPIRES_IN: '8h',
    OWNER_EMAIL: 'owner@test.com',
    OWNER_PASSWORD: 'ownerpassword123',
    DATABASE_URL: databaseUrl,
    RESEND_API_KEY: 'test-resend-api-key',
    RESEND_FROM_EMAIL: 'noreply@test.com',
    OTP_EXPIRES_IN_MINUTES: '10',
    CLOUDFLARE_R2_PUBLIC_URL: 'https://storage.test.com',
    CLOUDFLARE_R2_API_URL: 'https://test.r2.cloudflarestorage.com',
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-access-key-id',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-secret-access-key',
    CLOUDFLARE_R2_BUCKET: 'veracity-test',
  };

  Object.assign(process.env, testEnv);

  await runMigrations(databaseUrl);

  mockEmailProvider.sentEmails = [];
  mockStorageProvider.uploadRequests = [];

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EMAIL_PROVIDER)
    .useValue(mockEmailProvider)
    .overrideProvider(STORAGE_PROVIDER)
    .useValue(mockStorageProvider)
    .compile();

  app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_DEFAULT_VERSION,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}

export async function teardownTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  if (container) {
    await container.stop();
  }
}

export function getApp(): INestApplication {
  return app;
}
