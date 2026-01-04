import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ClsModule } from './common/cls/cls.module';
import { AppConfigModule } from './common/config/config.module';
import { PgGuestModule } from './common/db/pg-guest.module';
import { AppErrorFilter } from './common/filter/app-error.filter';
import { HealthModule } from './common/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { InterestModule } from './interest/interest.module';
import { UserAuthModule } from './user-auth/user-auth.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    ClsModule,
    PgGuestModule,
    HealthModule,
    InterestModule,
    UserAuthModule,
    AdminAuthModule,
    UserModule,
    AdminModule,
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
