import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool } from 'pg';
import { CLS_ADMIN_POOL } from '@/admin-auth/admin-jwt.strategy';

interface DbAdminPostRow {
  id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  author_id: string;
  author_email: string;
  author_first_name: string;
  author_last_name: string;
  author_avatar_url: string | null;
  author_role: string;
}

interface DbUserActivityRow {
  user_id: string;
  activity_type: string;
  entity_id: string;
  entity_type: string;
  content_preview: string | null;
  image_urls: string[] | null;
  activity_at: Date;
}

interface CountRow {
  count: string;
}

export interface AdminPost {
  id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  author_id: string;
  author_email: string;
  author_first_name: string;
  author_last_name: string;
  author_avatar_url: string | null;
  author_role: string;
}

export interface UserActivity {
  user_id: string;
  activity_type: string;
  entity_id: string;
  entity_type: string;
  content_preview: string | null;
  image_urls: string[] | null;
  activity_at: Date;
}

@Injectable()
export class ContentAdminService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_ADMIN_POOL);
  }

  async getUserPosts(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<{ posts: AdminPost[]; total: number }> {
    const pageOffset = offset ?? 0;
    const pageSize = limit ?? 20;

    const countResult = await this.pool.query<CountRow>(
      'SELECT COUNT(*) FROM admin.posts_v WHERE author_id = $1',
      [userId],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT * FROM admin.posts_v
      WHERE author_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query<DbAdminPostRow>(sql, [
      userId,
      pageSize,
      pageOffset,
    ]);

    const posts = result.rows.map((row) => this.mapAdminPostRow(row));
    return { posts, total };
  }

  async getUserActivity(
    userId: string,
    offset?: number,
    limit?: number,
  ): Promise<{ activities: UserActivity[]; total: number }> {
    const pageOffset = offset ?? 0;
    const pageSize = limit ?? 20;

    const countResult = await this.pool.query<CountRow>(
      'SELECT COUNT(*) FROM admin.user_activity_v WHERE user_id = $1',
      [userId],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT * FROM admin.user_activity_v
      WHERE user_id = $1
      ORDER BY activity_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query<DbUserActivityRow>(sql, [
      userId,
      pageSize,
      pageOffset,
    ]);

    const activities = result.rows.map((row) => this.mapUserActivityRow(row));
    return { activities, total };
  }

  private mapAdminPostRow(row: DbAdminPostRow): AdminPost {
    return {
      id: row.id,
      text: row.text,
      image_urls: row.image_urls,
      like_count: row.like_count,
      comment_count: row.comment_count,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
      deleted_at: row.deleted_at ? (row.deleted_at instanceof Date ? row.deleted_at : new Date(row.deleted_at)) : null,
      author_id: row.author_id,
      author_email: row.author_email,
      author_first_name: row.author_first_name,
      author_last_name: row.author_last_name,
      author_avatar_url: row.author_avatar_url,
      author_role: row.author_role,
    };
  }

  private mapUserActivityRow(row: DbUserActivityRow): UserActivity {
    return {
      user_id: row.user_id,
      activity_type: row.activity_type,
      entity_id: row.entity_id,
      entity_type: row.entity_type,
      content_preview: row.content_preview,
      image_urls: row.image_urls,
      activity_at: row.activity_at instanceof Date ? row.activity_at : new Date(row.activity_at),
    };
  }
}
