import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '@/common/config/config.service';
import { EmailModule } from '@/common/email/email.module';
import { UserAuthController } from './user-auth.controller';
import { UserAuthService } from './user-auth.service';
import { UserPoolRegistry } from './user-pool.registry';
import { UserJwtStrategy } from './user-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'user-jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.userJwt.secret,
      }),
    }),
    EmailModule,
  ],
  controllers: [UserAuthController],
  providers: [UserAuthService, UserPoolRegistry, UserJwtStrategy],
  exports: [UserPoolRegistry],
})
export class UserAuthModule {}
