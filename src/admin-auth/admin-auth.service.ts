import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { AppConfigService } from '@/common/config/config.service';
import { InvalidCredentialsError } from '@/user-auth/domain/invalid-credentials.error';
import { NotAuthorizedAsAdminError } from './domain/not-authorized-as-admin.error';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminPoolRegistry } from './admin-pool.registry';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly adminPoolRegistry: AdminPoolRegistry,
  ) {}

  async login(dto: AdminLoginDto): Promise<string> {
    let pool: Pool;

    try {
      pool = await this.adminPoolRegistry.createPoolForAdmin(dto.email, dto.password);
    } catch {
      throw new InvalidCredentialsError();
    }

    const roleResult = await pool.query('SELECT general.get_current_role() as role');
    const role = roleResult.rows[0]?.role;

    if (role !== 'moderator' && role !== 'owner') {
      this.adminPoolRegistry.removePool(dto.email);
      throw new NotAuthorizedAsAdminError();
    }

    const payload = {
      email: dto.email,
      role: role as 'moderator' | 'owner',
    };

    return this.jwtService.sign(payload as Record<string, unknown>, {
      secret: this.configService.adminJwt.secret,
      expiresIn: this.configService.adminJwt.expiresIn as `${number}h`,
    });
  }
}
