import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { AppConfigService } from '@/common/config/config.service';
import { CurrentUserPayload } from '@/common/decorator/current-user.decorator';
import { USER_ACCESS_TOKEN_COOKIE } from '@/common/const/cookie.const';
import { SessionExpiredError } from './domain/session-expired.error';
import { UserPoolRegistry } from './user-pool.registry';

interface JwtPayload {
  sub: string;
  email: string;
  status: string;
}

export const CLS_USER_POOL = 'userPool';

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    private readonly configService: AppConfigService,
    private readonly userPoolRegistry: UserPoolRegistry,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.[USER_ACCESS_TOKEN_COOKIE] || null,
      ignoreExpiration: false,
      secretOrKey: configService.userJwt.secret,
    });
  }

  validate(payload: JwtPayload): CurrentUserPayload {
    if (!this.userPoolRegistry.hasPool(payload.sub)) {
      throw new SessionExpiredError();
    }

    const pool = this.userPoolRegistry.getPoolById(payload.sub);
    this.cls.set(CLS_USER_POOL, pool);

    return {
      userId: payload.sub,
      email: payload.email,
      status: payload.status,
    };
  }
}
