import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_ADMIN_POOL } from '@/admin-auth/admin-jwt.strategy';
import { ModeratorNotFoundError } from './domain/moderator-not-found.error';
import { ModeratorAlreadyExistsError } from './domain/moderator-already-exists.error';
import { InvalidEmailFormatError } from './domain/invalid-email-format.error';
import { ForbiddenOperationError } from './domain/forbidden-operation.error';
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { ModeratorsQueryDto } from './dto/moderators-query.dto';

export interface ModeratorInfo {
  email: string;
  role: 'moderator' | 'owner';
}

@Injectable()
export class ModeratorsAdminService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_ADMIN_POOL);
  }

  async findModerators(
    query: ModeratorsQueryDto,
  ): Promise<{ moderators: ModeratorInfo[]; total: number }> {
    const pool = this.pool;
    const { offset = 0, limit = 20, search } = query;

    try {
      const [countResult, listResult] = await Promise.all([
        pool.query<{ count_moderators: string }>(
          'SELECT auth.count_moderators($1) as count_moderators',
          [search || null],
        ),
        pool.query<{ email: string }>('SELECT * FROM auth.list_moderators($1, $2, $3)', [
          search || null,
          limit,
          offset,
        ]),
      ]);

      return {
        moderators: listResult.rows.map((row) => ({
          email: row.email,
          role: 'moderator' as const,
        })),
        total: parseInt(countResult.rows[0].count_moderators, 10),
      };
    } catch (error) {
      throw this.mapPgError(error, '');
    }
  }

  async createModerator(dto: CreateModeratorDto): Promise<ModeratorInfo> {
    const pool = this.pool;
    try {
      await pool.query('SELECT auth.create_moderator($1, $2)', [dto.email, dto.password]);
      return { email: dto.email, role: 'moderator' };
    } catch (error) {
      throw this.mapPgError(error, dto.email);
    }
  }

  async deleteModerator(email: string): Promise<void> {
    const pool = this.pool;

    try {
      const roleCheck = await pool.query<{ moderator_exists: boolean }>(
        'SELECT auth.moderator_exists($1) as moderator_exists',
        [email],
      );

      if (!roleCheck.rows[0].moderator_exists) {
        throw new ModeratorNotFoundError(email);
      }

      await pool.query('SELECT auth.drop_moderator($1)', [email]);
    } catch (error) {
      if (error instanceof ModeratorNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error, email);
    }
  }

  private mapPgError(error: unknown, email: string): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (message.includes('User already exists')) {
        return new ModeratorAlreadyExistsError(email);
      }
      if (message.includes('Invalid email format')) {
        return new InvalidEmailFormatError(email);
      }
      if (message.includes('Only owner can')) {
        return new ForbiddenOperationError(message);
      }
      if (message.includes('Cannot drop owner')) {
        return new ForbiddenOperationError(message);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
