import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_USER_POOL } from '@/user-auth/user-jwt.strategy';
import {
  ConnectionWithAutoApproval,
  Connection,
  ConnectedUser,
  Interest,
} from './domain/connection.type';
import { ConnectionAlreadyExistsError } from './domain/connection-already-exists.error';
import { ConnectionNotFoundError } from './domain/connection-not-found.error';
import { CannotConnectToSelfError } from './domain/cannot-connect-to-self.error';
import { TargetUserNotActiveError } from './domain/target-user-not-active.error';
import { InvalidConnectionResponseError } from './domain/invalid-connection-response.error';
import { ConnectionRequestAlreadySentError } from './domain/connection-request-already-sent.error';
import { CanOnlyDeletePendingError } from './domain/can-only-delete-pending.error';
import { CanOnlyRespondToPendingError } from './domain/can-only-respond-to-pending.error';
import { UserNotFoundError } from '@/user/domain/user-not-found.error';
import { UserNotActiveError } from '@/user/domain/user-not-active.error';

interface DbConnectionRow {
  requester_user_id: string;
  target_user_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  was_auto_approved?: boolean;
}

interface DbConnectedUserRow {
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
  is_connected: boolean;
  has_outgoing_request: boolean;
  has_incoming_request: boolean;
  connection_created_at: Date;
}

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ConnectionService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_USER_POOL);
  }

  async sendConnectionRequest(targetUserId: string): Promise<ConnectionWithAutoApproval> {
    try {
      const result = await this.pool.query<DbConnectionRow>(
        `SELECT * FROM "user".send_connection_request($1)`,
        [targetUserId],
      );

      if (result.rows.length === 0) {
        throw new ConnectionNotFoundError();
      }

      return this.mapConnectionRowWithAutoApproval(result.rows[0]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async deleteConnectionRequest(targetUserId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT "user".delete_connection_request($1)`, [targetUserId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async deleteConnection(otherUserId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT "user".delete_connection($1)`, [otherUserId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async respondToConnection(
    requesterUserId: string,
    response: 'approved' | 'ignored',
  ): Promise<Connection> {
    try {
      const result = await this.pool.query<DbConnectionRow>(
        `SELECT * FROM "user".respond_to_connection($1, $2)`,
        [requesterUserId, response],
      );

      if (result.rows.length === 0) {
        throw new ConnectionNotFoundError();
      }

      return this.mapConnectionRow(result.rows[0]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getApprovedConnections(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ users: ConnectedUser[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [userId];
      const conditions: string[] = ['profile_owner_id = $1'];
      let paramIndex = 2;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      if (cursor) {
        const [connectionCreatedAt, id] = cursor.split(',');
        conditions.push(
          `(connection_created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(connectionCreatedAt, id);
        paramIndex += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT id, first_name, last_name, avatar_url, position, short_description,
               status, role, created_at, last_activity_at, interests,
               is_connected, has_outgoing_request, has_incoming_request, connection_created_at
        FROM "user".user_connections_v
        ${whereClause}
        ORDER BY connection_created_at DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbConnectedUserRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const connCreatedAt =
          lastRow.connection_created_at instanceof Date
            ? lastRow.connection_created_at
            : new Date(lastRow.connection_created_at);
        nextCursor = `${connCreatedAt.toISOString()},${lastRow.id}`;
      }

      const users = rows.map((row) => this.mapConnectedUserRow(row));
      return { users, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  private mapConnectionRow(row: DbConnectionRow): Connection {
    return {
      requester_user_id: row.requester_user_id,
      target_user_id: row.target_user_id,
      status: row.status as Connection['status'],
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
    };
  }

  private mapConnectionRowWithAutoApproval(row: DbConnectionRow): ConnectionWithAutoApproval {
    return {
      ...this.mapConnectionRow(row),
      was_auto_approved: row.was_auto_approved ?? false,
    };
  }

  private mapConnectedUserRow(row: DbConnectedUserRow): ConnectedUser {
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
      is_connected: row.is_connected,
      has_outgoing_request: row.has_outgoing_request,
      has_incoming_request: row.has_incoming_request,
      connection_created_at:
        row.connection_created_at instanceof Date
          ? row.connection_created_at
          : new Date(row.connection_created_at),
    };
  }

  private mapPgError(error: unknown): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (error instanceof DatabaseError && error.code === '23505') {
        if (error.constraint === 'connections_bidirectional_unique_idx') {
          return new ConnectionRequestAlreadySentError();
        }
      }

      if (message.includes('Connection already exists')) {
        return new ConnectionAlreadyExistsError();
      }
      if (message.includes('Connection request already sent')) {
        return new ConnectionRequestAlreadySentError();
      }
      if (
        message.includes('Connection request not found') ||
        message.includes('Connection not found')
      ) {
        return new ConnectionNotFoundError();
      }
      if (message.includes('Cannot connect to self')) {
        return new CannotConnectToSelfError();
      }
      if (message.includes('Target user not found')) {
        return new UserNotFoundError();
      }
      if (message.includes('Target user is not active')) {
        return new TargetUserNotActiveError();
      }
      if (message.includes('Invalid response')) {
        return new InvalidConnectionResponseError();
      }
      if (message.includes('Can only delete pending')) {
        return new CanOnlyDeletePendingError();
      }
      if (message.includes('Can only respond to pending')) {
        return new CanOnlyRespondToPendingError();
      }
      if (message.includes('User not found')) {
        return new UserNotFoundError();
      }
      if (message.includes('User is not active') || message.includes('Access denied')) {
        return new UserNotActiveError();
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
