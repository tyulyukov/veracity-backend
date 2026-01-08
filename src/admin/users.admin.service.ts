import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_ADMIN_POOL } from '@/admin-auth/admin-jwt.strategy';
import { UserNotFoundError } from '@/user/domain/user-not-found.error';
import { UserWithInterestsAndStats, Interest } from '@/user/domain/user.type';
import { ForbiddenOperationError } from './domain/forbidden-operation.error';
import { UsersQueryDto } from './dto/users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserEventRelation } from '@/event/domain/event.type';

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
  total_connections: number;
  pending_sent_count: number;
  pending_received_count: number;
}

interface CountRow {
  count: string;
}

interface DbUserEventRelationRow {
  user_id: string;
  event_relation_type: 'created' | 'registered';
  event_id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  description: string | null;
  image_urls: string[];
  tags: string[];
  limit_participants: number | null;
  participant_count: number;
  created_at: Date;
  registration_comment: string | null;
  registration_created_at: Date | null;
}

@Injectable()
export class UsersAdminService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_ADMIN_POOL);
  }

  async findUserById(userId: string): Promise<UserWithInterestsAndStats> {
    try {
      const result = await this.pool.query<DbUserRow>(
        `SELECT * FROM admin.users_with_interests_v WHERE id = $1`,
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

  async findUsers(
    query: UsersQueryDto,
  ): Promise<{ users: UserWithInterestsAndStats[]; total: number }> {
    try {
      const params: (string | number)[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (query.status) {
        conditions.push(`status = $${paramIndex}::user_status`);
        params.push(query.status);
        paramIndex++;
      }

      let searchParamIndex: number | null = null;
      if (query.search) {
        searchParamIndex = paramIndex;
        conditions.push(`(
          LOWER(first_name || ' ' || last_name) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR LOWER(first_name) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR LOWER(last_name) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR LOWER(email) LIKE '%' || LOWER($${paramIndex}) || '%'
          OR EXISTS (
            SELECT 1 FROM unnest(string_to_array(LOWER($${paramIndex}), ' ')) AS word
            WHERE LOWER(first_name) LIKE '%' || word || '%'
               OR LOWER(last_name) LIKE '%' || word || '%'
               OR LOWER(email) LIKE '%' || word || '%'
          )
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

      const orderByClause =
        query.search && searchParamIndex !== null
          ? `ORDER BY
            CASE
              WHEN LOWER(first_name || ' ' || last_name) = LOWER($${searchParamIndex}) THEN 1
              WHEN LOWER(email) = LOWER($${searchParamIndex}) THEN 1
              WHEN LOWER(first_name || ' ' || last_name) LIKE '%' || LOWER($${searchParamIndex}) || '%' THEN 2
              WHEN LOWER(email) LIKE '%' || LOWER($${searchParamIndex}) || '%' THEN 2
              WHEN EXISTS (
                SELECT 1 FROM unnest(string_to_array(LOWER($${searchParamIndex}), ' ')) AS word
                WHERE LOWER(first_name) LIKE '%' || word || '%'
                   OR LOWER(last_name) LIKE '%' || word || '%'
                   OR LOWER(email) LIKE '%' || word || '%'
              ) THEN 3
              ELSE 4
            END,
            created_at DESC,
            id DESC`
          : 'ORDER BY created_at DESC, id DESC';

      const sql = `
        SELECT * FROM admin.users_with_interests_v
        ${whereClause}
        ${orderByClause}
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

  async getUserEventRelations(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<{ events: UserEventRelation[]; total: number }> {
    try {
      const userExists = await this.pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userExists.rows.length === 0) {
        throw new UserNotFoundError(userId);
      }

      const countSql = `SELECT COUNT(*) FROM admin.user_events_and_registrations_v WHERE user_id = $1`;
      const countResult = await this.pool.query<CountRow>(countSql, [userId]);
      const total = parseInt(countResult.rows[0].count, 10);

      const pageLimit = limit ?? 20;
      const pageOffset = offset ?? 0;

      const result = await this.pool.query<DbUserEventRelationRow>(
        `SELECT * FROM admin.user_events_and_registrations_v
         WHERE user_id = $1
         ORDER BY event_date DESC, created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, pageLimit, pageOffset],
      );

      const events = result.rows.map((row) => this.mapEventRelationRow(row));
      return { events, total };
    } catch (error) {
      if (error instanceof UserNotFoundError) throw error;
      throw this.mapPgError(error);
    }
  }

  private mapDbRow(row: DbUserRow): UserWithInterestsAndStats {
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
      total_connections: row.total_connections,
      pending_sent_count: row.pending_sent_count,
      pending_received_count: row.pending_received_count,
    };
  }

  private mapEventRelationRow(row: DbUserEventRelationRow): UserEventRelation {
    return {
      user_id: row.user_id,
      event_relation_type: row.event_relation_type,
      event_id: row.event_id,
      name: row.name,
      is_online: row.is_online,
      event_date: row.event_date instanceof Date ? row.event_date : new Date(row.event_date),
      location: row.location,
      link: row.link,
      description: row.description,
      image_urls: row.image_urls,
      tags: row.tags,
      limit_participants: row.limit_participants,
      participant_count: row.participant_count,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      registration_comment: row.registration_comment,
      registration_created_at: row.registration_created_at
        ? row.registration_created_at instanceof Date
          ? row.registration_created_at
          : new Date(row.registration_created_at)
        : null,
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
