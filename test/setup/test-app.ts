import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from '@/common/const/app.const';
import { runMigrations } from './run-migrations';

let container: StartedPostgreSqlContainer;
let app: INestApplication;

export async function setupTestApp(): Promise<INestApplication> {
  container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('veracity_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const databaseUrl = `postgres://postgres:postgres@${container.getHost()}:${container.getPort()}/veracity_test`;

  const testEnv = {
    NODE_ENV: 'local',
    PORT: '7007',
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
  };

  Object.assign(process.env, testEnv);

  await runMigrations(databaseUrl);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

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
