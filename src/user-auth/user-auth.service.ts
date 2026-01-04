import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool, DatabaseError } from 'pg';
import { PG_GUEST_POOL } from '@/common/db/pg-guest.module';
import { AppConfigService } from '@/common/config/config.service';
import { UserAlreadyExistsError } from '@/user/domain/user-already-exists.error';
import { InvalidCredentialsError } from './domain/invalid-credentials.error';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserPoolRegistry } from './user-pool.registry';
import { InvalidEmailFormatError } from './domain/invalid-email-format.error';

@Injectable()
export class UserAuthService {
  constructor(
    @Inject(PG_GUEST_POOL) private readonly guestPool: Pool,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly userPoolRegistry: UserPoolRegistry,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string }> {
    try {
      const result = await this.guestPool.query<{ register_user: string }>(
        `SELECT guest.register_user($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          dto.email,
          dto.password,
          dto.firstName,
          dto.lastName,
          dto.avatarUrl || null,
          dto.position || null,
          dto.contactInfo ? JSON.stringify(dto.contactInfo) : null,
          dto.shortDescription || null,
          dto.interestIds,
        ],
      );

      return { userId: result.rows[0].register_user };
    } catch (error) {
      throw this.mapPgError(error, dto.email);
    }
  }

  async login(dto: LoginDto): Promise<string> {
    const userResult = await this.guestPool.query<{ id: string; email: string; status: string }>(
      'SELECT * FROM guest.get_user_for_login($1)',
      [dto.email],
    );

    if (userResult.rows.length === 0) {
      throw new InvalidCredentialsError();
    }

    const user = userResult.rows[0];

    try {
      await this.userPoolRegistry.createPoolForUser(user.id, dto.email, dto.password);
    } catch {
      throw new InvalidCredentialsError();
    }

    const payload = {
      sub: user.id,
      email: user.email,
      status: user.status,
    };

    return this.jwtService.sign(payload as Record<string, unknown>, {
      secret: this.configService.userJwt.secret,
      expiresIn: this.configService.userJwt.expiresIn as `${number}d`,
    });
  }

  private mapPgError(error: unknown, email: string): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (message.includes('User already exists')) {
        return new UserAlreadyExistsError(email);
      }
      if (message.includes('Invalid email format')) {
        return new InvalidEmailFormatError(email);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
