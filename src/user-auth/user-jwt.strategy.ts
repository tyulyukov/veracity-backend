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
}

interface DbUserRow {
  id: string;
  email: string;
  status: string;
  role: string;
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

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    if (!this.userPoolRegistry.hasPool(payload.sub)) {
      throw new SessionExpiredError();
    }

    const pool = this.userPoolRegistry.getPoolById(payload.sub);
    this.cls.set(CLS_USER_POOL, pool);

    const result = await pool.query<DbUserRow>(
      'SELECT id, email, status, role FROM users WHERE id = $1',
      [payload.sub],
    );

    if (result.rows.length === 0) {
      throw new SessionExpiredError();
    }

    const user = result.rows[0];

    return {
      userId: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
    };
  }
}
