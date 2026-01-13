import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool, DatabaseError } from 'pg';
import { PG_GUEST_POOL } from '@/common/db/pg-guest.module';
import { AppConfigService } from '@/common/config/config.service';
import { EmailService } from '@/common/email/email.service';
import { UserAlreadyExistsError } from '@/user/domain/user-already-exists.error';
import { InvalidCredentialsError } from './domain/invalid-credentials.error';
import { InvalidEmailFormatError } from './domain/invalid-email-format.error';
import { OtpExpiredError } from './domain/otp-expired.error';
import { OtpInvalidError } from './domain/otp-invalid.error';
import { OtpThrottledError } from './domain/otp-throttled.error';
import { UserNotFoundError } from './domain/user-not-found.error';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserPoolRegistry } from './user-pool.registry';

@Injectable()
export class UserAuthService {
  constructor(
    @Inject(PG_GUEST_POOL) private readonly guestPool: Pool,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly userPoolRegistry: UserPoolRegistry,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; accessToken: string }> {
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

      const userId = result.rows[0].register_user;

      await this.userPoolRegistry.createPoolForUser(userId, dto.email, dto.password);

      const payload = { sub: userId };

      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.userJwt.secret,
        expiresIn: this.configService.userJwt.expiresIn as `${number}d`,
      });

      return { userId, accessToken };
    } catch (error) {
      throw this.mapPgError(error, dto.email);
    }
  }

  async login(dto: LoginDto): Promise<string> {
    const userResult = await this.guestPool.query<{ id: string }>(
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

    const payload = { sub: user.id };

    return this.jwtService.sign(payload, {
      secret: this.configService.userJwt.secret,
      expiresIn: this.configService.userJwt.expiresIn as `${number}d`,
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const result = await this.guestPool.query<{ create_otp: string }>(
        'SELECT guest.create_otp($1, $2)',
        [email, this.configService.otp.expiresInMinutes],
      );

      const code = result.rows[0].create_otp;
      await this.emailService.sendOtp(email, code);
    } catch (error) {
      throw this.mapOtpError(error);
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      await this.guestPool.query('SELECT guest.reset_password_with_otp($1, $2, $3)', [
        email,
        code,
        newPassword,
      ]);
    } catch (error) {
      throw this.mapOtpError(error);
    }
  }

  private mapOtpError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('User not found')) {
        return new UserNotFoundError();
      }
      if (
        message.includes('OTP request rate limit exceeded') ||
        message.includes('Too many failed attempts')
      ) {
        return new OtpThrottledError();
      }
      if (message.includes('OTP not found or expired')) {
        return new OtpExpiredError();
      }
      if (message.includes('Invalid OTP code')) {
        return new OtpInvalidError();
      }
    }
    return error instanceof Error ? error : new Error(String(error));
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
