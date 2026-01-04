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
          'SELECT owner.count_moderators($1) AS count_moderators',
          [search || null],
        ),
        pool.query<{ email: string }>('SELECT * FROM owner.list_moderators($1, $2, $3)', [
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
      await pool.query('SELECT owner.create_moderator($1, $2)', [dto.email, dto.password]);
      return { email: dto.email, role: 'moderator' };
    } catch (error) {
      throw this.mapPgError(error, dto.email);
    }
  }

  async deleteModerator(email: string): Promise<void> {
    const pool = this.pool;

    try {
      await pool.query('SELECT owner.drop_moderator($1)', [email]);
    } catch (error) {
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
      if (message.includes('Moderator does not exist')) {
        return new ModeratorNotFoundError(email);
      }
      if (message.includes('Can only drop moderators')) {
        return new ModeratorNotFoundError(email);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
