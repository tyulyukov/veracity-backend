import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_USER_POOL } from '@/user-auth/user-jwt.strategy';
import { UserNotFoundError } from './domain/user-not-found.error';
import { UserNotActiveError } from './domain/user-not-active.error';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserWithInterests, OtherUserWithInterests, Interest } from './domain/user.type';

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

interface DbOtherUserRow {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position: string | null;
  short_description: string | null;
  status: string;
  role: string;
  created_at: Date;
  last_activity_at: Date | null;
  interests: Interest[] | string;
}

const PAGE_SIZE = 20;

@Injectable()
export class UserService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_USER_POOL);
  }

  async findById(userId: string): Promise<UserWithInterests> {
    try {
      const result = await this.pool.query<DbUserRow>(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.position,
                u.contact_info, u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
                COALESCE(
                  json_agg(json_build_object('id', i.id, 'name', i.name))
                  FILTER (WHERE i.id IS NOT NULL), '[]'::json
                ) AS interests
         FROM users u
         LEFT JOIN user_interests ui ON ui.user_id = u.id
         LEFT JOIN interests i ON i.id = ui.interest_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [userId],
      );

      if (result.rows.length === 0) {
        throw new UserNotFoundError(userId);
      }

      return this.mapDbRow(result.rows[0]);
    } catch (error) {
      if (error instanceof UserNotFoundError) throw error;
      throw this.mapPgError(error);
    }
  }

  async update(dto: UpdateMeDto): Promise<UserWithInterests> {
    try {
      const result = await this.pool.query<{ user_id: string }>(
        `SELECT "user".update_profile($1, $2, $3, $4, $5, $6, $7) AS user_id`,
        [
          dto.firstName ?? null,
          dto.lastName ?? null,
          dto.avatarUrl ?? null,
          dto.position ?? null,
          dto.contactInfo ? JSON.stringify(dto.contactInfo) : null,
          dto.shortDescription ?? null,
          dto.interestIds ?? null,
        ],
      );

      return this.findById(result.rows[0].user_id);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async findActiveUsers(
    query: UsersQueryDto,
  ): Promise<{ users: OtherUserWithInterests[]; nextCursor: string | null }> {
    try {
      const params: (string | string[] | null)[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (query.interestIds && query.interestIds.length > 0) {
        conditions.push(
          `id IN (SELECT user_id FROM user_interests WHERE interest_id = ANY($${paramIndex}::uuid[]))`,
        );
        params.push(query.interestIds);
        paramIndex++;
      }

      if (query.search) {
        conditions.push(`(
          LOWER(first_name) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR LOWER(last_name) LIKE '%' || LOWER($${paramIndex}) || '%'
        )`);
        params.push(query.search);
        paramIndex++;
      }

      if (query.cursor) {
        const [createdAt, id] = query.cursor.split(',');
        conditions.push(
          `(created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(createdAt, id);
        paramIndex += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT * FROM "user".other_active_users_v
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${PAGE_SIZE + 1}
      `;

      const result = await this.pool.query<DbOtherUserRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > PAGE_SIZE) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        nextCursor = `${lastRow.created_at.toISOString()},${lastRow.id}`;
      }

      const users = rows.map((row) => this.mapOtherUserRow(row));
      return { users, nextCursor };
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

  private mapOtherUserRow(row: DbOtherUserRow): OtherUserWithInterests {
    const interests = typeof row.interests === 'string' ? JSON.parse(row.interests) : row.interests;
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      position: row.position,
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
      if (message.includes('User is not active') || message.includes('Access denied')) {
        return new UserNotActiveError();
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
