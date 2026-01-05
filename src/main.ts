import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './common/config/config.service';
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX } from './common/const/app.const';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(AppConfigService);

  app.use(cookieParser());

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_DEFAULT_VERSION,
  });

  app.enableShutdownHooks();
  app.enableCors({ credentials: true, origin: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Veracity API')
    .setDescription('Veracity - Business Networking Platform API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    `/${API_GLOBAL_PREFIX}/docs`,
    apiReference({
      sources: [{ content: document }],
    }),
  );
  app.use(`/${API_GLOBAL_PREFIX}/docs.json`, (req: Request, res: Response) => res.send(document));

  const port = configService.app.port;
  await app.listen(port);

  logger.log('Application is running', {
    port,
    url: `http://localhost:${port}`,
    docs: `http://localhost:${port}/${API_GLOBAL_PREFIX}/docs`,
  });
}

bootstrap().catch((err) => console.error(err));
