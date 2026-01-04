import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '@/common/config/config.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminPoolRegistry } from './admin-pool.registry';
import { AdminJwtStrategy } from './admin-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.adminJwt.secret,
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminPoolRegistry, AdminJwtStrategy],
  exports: [AdminPoolRegistry],
})
export class AdminAuthModule {}
