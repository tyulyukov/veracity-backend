import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ClsModule } from './common/cls/cls.module';
import { AppConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/db/database.module';
import { AppErrorFilter } from './common/filter/app-error.filter';
import { HealthModule } from './common/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    ClsModule,
    DatabaseModule,
    HealthModule,
    UserModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppErrorFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule {}
