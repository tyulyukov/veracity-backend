import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { AppConfigService } from '@/common/config/config.service';
import { CurrentAdminPayload } from '@/common/decorator/current-admin.decorator';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '@/common/const/cookie.const';
import { SessionExpiredError } from '@/user-auth/domain/session-expired.error';
import { AdminPoolRegistry } from './admin-pool.registry';

interface JwtPayload {
  email: string;
  role: 'moderator' | 'owner';
}

export const CLS_ADMIN_POOL = 'adminPool';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: AppConfigService,
    private readonly adminPoolRegistry: AdminPoolRegistry,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.[ADMIN_ACCESS_TOKEN_COOKIE] || null,
      ignoreExpiration: false,
      secretOrKey: configService.adminJwt.secret,
    });
  }

  validate(payload: JwtPayload): CurrentAdminPayload {
    if (!this.adminPoolRegistry.hasPool(payload.email)) {
      throw new SessionExpiredError();
    }

    const pool = this.adminPoolRegistry.getPoolByEmail(payload.email);
    this.cls.set(CLS_ADMIN_POOL, pool);

    return {
      email: payload.email,
      role: payload.role,
    };
  }
}
