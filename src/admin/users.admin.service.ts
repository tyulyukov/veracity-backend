import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_ADMIN_POOL } from '@/admin-auth/admin-jwt.strategy';
import { UserNotFoundError } from '@/user/domain/user-not-found.error';
import { UserWithInterests, Interest } from '@/user/domain/user.type';
import { ForbiddenOperationError } from './domain/forbidden-operation.error';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

interface DbUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position: string | null;
  contact_info: Record<string, string> | null;
  short_description: string | null;
  status: string;
  role: string;
  created_at: Date;
  last_activity_at: Date | null;
  interests: Interest[] | string;
}

interface CountRow {
  count: string;
}

@Injectable()
export class UsersAdminService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_ADMIN_POOL);
  }

  async findUsers(query: UsersQueryDto): Promise<{ users: UserWithInterests[]; total: number }> {
    try {
      const params: (string | number)[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (query.status) {
        conditions.push(`status = $${paramIndex}::user_status`);
        params.push(query.status);
        paramIndex++;
      }

      if (query.search) {
        conditions.push(`(
          LOWER(first_name) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR LOWER(last_name) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR LOWER(email) LIKE '%' || LOWER($${paramIndex}) || '%'
        )`);
        params.push(query.search);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) FROM admin.users_with_interests_v ${whereClause}`;
      const countResult = await this.pool.query<CountRow>(countSql, params);
      const total = parseInt(countResult.rows[0].count, 10);

      const limit = query.limit ?? 20;
      const offset = query.offset ?? 0;

      const sql = `
        SELECT * FROM admin.users_with_interests_v
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const result = await this.pool.query<DbUserRow>(sql, params);
      const users = result.rows.map((row) => this.mapDbRow(row));

      return { users, total };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto): Promise<void> {
    try {
      await this.pool.query('SELECT admin.update_user_status($1, $2)', [userId, dto.status]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto): Promise<void> {
    try {
      const userResult = await this.pool.query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1',
        [userId],
      );

      if (userResult.rows.length === 0) {
        throw new UserNotFoundError(userId);
      }

      await this.pool.query('SELECT admin.update_user_role($1, $2)', [
        userResult.rows[0].email,
        dto.role,
      ]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  private mapDbRow(row: DbUserRow): UserWithInterests {
    const interests = typeof row.interests === 'string' ? JSON.parse(row.interests) : row.interests;
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      position: row.position,
      contact_info: row.contact_info,
      short_description: row.short_description,
      status: row.status,
      role: row.role,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      last_activity_at: row.last_activity_at
        ? row.last_activity_at instanceof Date
          ? row.last_activity_at
          : new Date(row.last_activity_at)
        : null,
      interests,
    };
  }

  private mapPgError(error: unknown): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (message.includes('User not found')) {
        return new UserNotFoundError('');
      }
      if (message.includes('User does not exist')) {
        return new ForbiddenOperationError('User DB role does not exist');
      }
      if (message.includes('Cannot modify admin user roles')) {
        return new ForbiddenOperationError(message);
      }
      if (message.includes('Only moderator or owner can')) {
        return new ForbiddenOperationError(message);
      }
      if (message.includes('Access denied')) {
        return new ForbiddenOperationError('Access denied');
      }
      if (message.includes('Invalid status')) {
        return new ForbiddenOperationError('Invalid status');
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
