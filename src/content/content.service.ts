import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_USER_POOL } from '@/user-auth/user-jwt.strategy';
import { PostFeedItem, PostWithDetails, MyPost } from './domain/post.type';
import { CommentWithAuthor } from './domain/comment.type';
import { PostNotFoundError } from './domain/post-not-found.error';
import { CommentNotFoundError } from './domain/comment-not-found.error';
import { PostAlreadyDeletedError } from './domain/post-already-deleted.error';
import { CommentAlreadyDeletedError } from './domain/comment-already-deleted.error';
import { AlreadyLikedError } from './domain/already-liked.error';
import { LikeNotFoundError } from './domain/like-not-found.error';
import { PostRequiresContentError } from './domain/post-requires-content.error';
import { CommentRequiresTextError } from './domain/comment-requires-text.error';
import { UnauthorizedPostAccessError } from './domain/unauthorized-post-access.error';
import { UnauthorizedCommentAccessError } from './domain/unauthorized-comment-access.error';
import { NotConnectedToUserError } from './domain/not-connected-to-user.error';
import { UserNotFoundError } from '@/user/domain/user-not-found.error';

interface DbPostRow {
  id: string;
  author_id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  created_at: Date;
  updated_at: Date;
}

interface DbPostFeedItemRow {
  id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_avatar_url: string | null;
  author_role: string;
  is_liked_by_current_user: boolean;
}

interface DbMyPostRow {
  id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  is_liked_by_current_user: boolean;
}

interface DbCommentWithAuthorRow {
  id: string;
  post_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_avatar_url: string | null;
  author_role: string;
}

interface DbPostLikeRow {
  post_id: string;
  user_id: string;
  created_at: Date;
}

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ContentService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_USER_POOL);
  }

  async getFeed(
    cursor?: string,
    limit?: number,
  ): Promise<{ posts: PostFeedItem[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [];
      let paramIndex = 1;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      let whereClause = '';
      if (cursor) {
        const [createdAt, id] = cursor.split(',');
        whereClause = `WHERE (created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`;
        params.push(createdAt, id);
        paramIndex += 2;
      }

      const sql = `
        SELECT id, text, image_urls, like_count, comment_count,
               created_at, updated_at,
               author_id, author_first_name, author_last_name, author_avatar_url, author_role,
               is_liked_by_current_user
        FROM "user".posts_feed_v
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbPostFeedItemRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const createdAt =
          lastRow.created_at instanceof Date ? lastRow.created_at : new Date(lastRow.created_at);
        nextCursor = `${createdAt.toISOString()},${lastRow.id}`;
      }

      const posts = rows.map((row) => this.mapPostFeedItemRow(row));
      return { posts, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getMyPosts(
    cursor?: string,
    limit?: number,
  ): Promise<{ posts: MyPost[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [];
      let paramIndex = 1;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      let whereClause = '';
      if (cursor) {
        const [createdAt, id] = cursor.split(',');
        whereClause = `WHERE (created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`;
        params.push(createdAt, id);
        paramIndex += 2;
      }

      const sql = `
        SELECT id, text, image_urls, like_count, comment_count,
               created_at, updated_at, is_liked_by_current_user
        FROM "user".my_posts_v
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbMyPostRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const createdAt =
          lastRow.created_at instanceof Date ? lastRow.created_at : new Date(lastRow.created_at);
        nextCursor = `${createdAt.toISOString()},${lastRow.id}`;
      }

      const posts = rows.map((row) => this.mapMyPostRow(row));
      return { posts, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getUserPosts(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ posts: PostFeedItem[]; nextCursor: string | null }> {
    try {
      const userCheck = await this.pool.query<{ id: string; status: string }>(
        `SELECT id, status FROM users WHERE id = $1`,
        [userId],
      );

      if (userCheck.rows.length === 0) {
        throw new UserNotFoundError(userId);
      }

      if (userCheck.rows[0].status !== 'active') {
        throw new UserNotFoundError(userId);
      }

      const connectionCheck = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM connections c
          JOIN users u ON u.email = session_user
          WHERE c.status = 'approved'
            AND ((c.requester_user_id = u.id AND c.target_user_id = $1)
              OR (c.requester_user_id = $1 AND c.target_user_id = u.id))
        ) AS exists`,
        [userId],
      );

      if (!connectionCheck.rows[0].exists) {
        throw new NotConnectedToUserError(userId);
      }

      const params: (string | null)[] = [userId];
      const conditions: string[] = [`author_id = $1`];
      let paramIndex = 2;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      if (cursor) {
        const [createdAt, id] = cursor.split(',');
        conditions.push(
          `(created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(createdAt, id);
        paramIndex += 2;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const sql = `
        SELECT id, text, image_urls, like_count, comment_count,
               created_at, updated_at,
               author_id, author_first_name, author_last_name, author_avatar_url, author_role,
               is_liked_by_current_user
        FROM "user".user_posts_v
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbPostFeedItemRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const createdAt =
          lastRow.created_at instanceof Date ? lastRow.created_at : new Date(lastRow.created_at);
        nextCursor = `${createdAt.toISOString()},${lastRow.id}`;
      }

      const posts = rows.map((row) => this.mapPostFeedItemRow(row));
      return { posts, nextCursor };
    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof NotConnectedToUserError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async getPostById(postId: string): Promise<PostWithDetails> {
    try {
      const result = await this.pool.query<DbPostFeedItemRow>(
        `SELECT * FROM "user".post_with_details_v WHERE id = $1`,
        [postId],
      );

      if (result.rows.length === 0) {
        throw new PostNotFoundError(postId);
      }

      return this.mapPostFeedItemRow(result.rows[0]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async getMyPostById(postId: string): Promise<MyPost> {
    try {
      const result = await this.pool.query<DbMyPostRow>(
        `SELECT id, text, image_urls, like_count, comment_count,
                created_at, updated_at, is_liked_by_current_user
         FROM "user".my_posts_v
         WHERE id = $1`,
        [postId],
      );

      if (result.rows.length === 0) {
        throw new PostNotFoundError(postId);
      }

      return this.mapMyPostRow(result.rows[0]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async createPost(text?: string, imageUrls?: string[]): Promise<PostWithDetails> {
    try {
      const result = await this.pool.query<DbPostRow>(
        `SELECT * FROM "user".fn_create_post($1, $2)`,
        [text || null, imageUrls || []],
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to create post');
      }

      const postId = result.rows[0].id;
      return this.getPostById(postId);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async updatePost(postId: string, text?: string, imageUrls?: string[]): Promise<PostWithDetails> {
    try {
      const result = await this.pool.query<DbPostRow>(
        `SELECT * FROM "user".fn_update_post($1, $2, $3)`,
        [postId, text || null, imageUrls || []],
      );

      if (result.rows.length === 0) {
        throw new PostNotFoundError(postId);
      }

      return this.getPostById(postId);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT "user".fn_soft_delete_post($1)`, [postId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async likePost(postId: string): Promise<void> {
    try {
      await this.pool.query<DbPostLikeRow>(`SELECT * FROM "user".fn_like_post($1)`, [postId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async unlikePost(postId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT "user".fn_unlike_post($1)`, [postId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getComments(
    postId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ comments: CommentWithAuthor[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [postId];
      const conditions: string[] = [`post_id = $1`];
      let paramIndex = 2;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      if (cursor) {
        const [createdAt, id] = cursor.split(',');
        conditions.push(
          `(created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(createdAt, id);
        paramIndex += 2;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const sql = `
        SELECT id, post_id, text, created_at, updated_at,
               author_id, author_first_name, author_last_name, author_avatar_url, author_role
        FROM "user".post_comments_v
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbCommentWithAuthorRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const createdAt =
          lastRow.created_at instanceof Date ? lastRow.created_at : new Date(lastRow.created_at);
        nextCursor = `${createdAt.toISOString()},${lastRow.id}`;
      }

      const comments = rows.map((row) => this.mapCommentWithAuthorRow(row));
      return { comments, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async createComment(postId: string, text: string): Promise<CommentWithAuthor> {
    try {
      const result = await this.pool.query(`SELECT * FROM "user".fn_create_comment($1, $2)`, [
        postId,
        text,
      ]);

      if (result.rows.length === 0) {
        throw new PostNotFoundError(postId);
      }

      const commentId = result.rows[0].id;
      return this.getCommentById(commentId);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async updateComment(commentId: string, text: string): Promise<CommentWithAuthor> {
    try {
      const result = await this.pool.query(`SELECT * FROM "user".fn_update_comment($1, $2)`, [
        commentId,
        text,
      ]);

      if (result.rows.length === 0) {
        throw new CommentNotFoundError(commentId);
      }

      return this.getCommentById(commentId);
    } catch (error) {
      if (error instanceof CommentNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT "user".fn_soft_delete_comment($1)`, [commentId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  private async getCommentById(commentId: string): Promise<CommentWithAuthor> {
    const result = await this.pool.query<DbCommentWithAuthorRow>(
      `SELECT * FROM "user".post_comments_v WHERE id = $1`,
      [commentId],
    );

    if (result.rows.length === 0) {
      throw new CommentNotFoundError(commentId);
    }

    return this.mapCommentWithAuthorRow(result.rows[0]);
  }

  private mapPostFeedItemRow(row: DbPostFeedItemRow): PostFeedItem {
    return {
      id: row.id,
      text: row.text,
      image_urls: row.image_urls,
      like_count: row.like_count,
      comment_count: row.comment_count,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
      author_id: row.author_id,
      author_first_name: row.author_first_name,
      author_last_name: row.author_last_name,
      author_avatar_url: row.author_avatar_url,
      author_role: row.author_role,
      is_liked_by_current_user: row.is_liked_by_current_user,
    };
  }

  private mapMyPostRow(row: DbMyPostRow): MyPost {
    return {
      id: row.id,
      text: row.text,
      image_urls: row.image_urls,
      like_count: row.like_count,
      comment_count: row.comment_count,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
      is_liked_by_current_user: row.is_liked_by_current_user,
    };
  }

  private mapCommentWithAuthorRow(row: DbCommentWithAuthorRow): CommentWithAuthor {
    return {
      id: row.id,
      post_id: row.post_id,
      text: row.text,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
      author_id: row.author_id,
      author_first_name: row.author_first_name,
      author_last_name: row.author_last_name,
      author_avatar_url: row.author_avatar_url,
      author_role: row.author_role,
    };
  }

  private mapPgError(error: unknown): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (message.includes('Post not found')) {
        return new PostNotFoundError();
      }
      if (message.includes('Comment not found')) {
        return new CommentNotFoundError();
      }
      if (message.includes('Post has been deleted')) {
        return new PostAlreadyDeletedError();
      }
      if (message.includes('Comment has been deleted')) {
        return new CommentAlreadyDeletedError();
      }
      if (message.includes('Post already deleted')) {
        return new PostAlreadyDeletedError();
      }
      if (message.includes('Comment already deleted')) {
        return new CommentAlreadyDeletedError();
      }
      if (message.includes('Already liked this post')) {
        return new AlreadyLikedError();
      }
      if (message.includes('Like not found')) {
        return new LikeNotFoundError();
      }
      if (message.includes('Post must have text or images')) {
        return new PostRequiresContentError();
      }
      if (message.includes('Comment text is required')) {
        return new CommentRequiresTextError();
      }
      if (message.includes('You can only update your own posts')) {
        return new UnauthorizedPostAccessError('update');
      }
      if (message.includes('You can only delete your own posts')) {
        return new UnauthorizedPostAccessError('delete');
      }
      if (message.includes('You can only update your own comments')) {
        return new UnauthorizedCommentAccessError('update');
      }
      if (message.includes('You can only delete your own comments')) {
        return new UnauthorizedCommentAccessError('delete');
      }
    }

    return error as Error;
  }
}
