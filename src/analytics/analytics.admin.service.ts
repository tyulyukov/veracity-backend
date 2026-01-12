import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_ADMIN_POOL } from '@/admin-auth/admin-jwt.strategy';
import { AnalyticsAccessDeniedError } from './domain/analytics-access-denied.error';
import { InvalidDateRangeError } from './domain/invalid-date-range.error';
import { TimeInterval } from './dto/date-range-query.dto';

export interface UserGrowthDataPoint {
  date: string;
  userCount: number;
}

export interface ConnectionActivityDataPoint {
  date: string;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface ContentEngagementDataPoint {
  date: string;
  postsCount: number;
  likesCount: number;
  commentsCount: number;
}

export interface EventInterestDataPoint {
  month: number;
  registrationsCount: number;
  eventsCount: number;
}

export interface TopInterestDataPoint {
  interestId: string;
  interestName: string;
  userCount: number;
}

export interface UserRetentionDataPoint {
  date: string;
  activeUsers: number;
  totalUsers: number;
  retentionRate: number;
}

export interface PlatformOverview {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalConnections: number;
  pendingConnections: number;
  avgConnectionsPerUser: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalEvents: number;
  totalEventRegistrations: number;
  totalSpeakers: number;
}

export interface SpeakerAnalyticsDataPoint {
  speakerId: string;
  firstName: string;
  lastName: string;
  eventsCount: number;
  totalRegistrations: number;
  avgRegistrationsPerEvent: number;
}

interface UserGrowthRow {
  period: Date;
  user_count: string;
}

interface ConnectionActivityRow {
  period: Date;
  sent_count: string;
  accepted_count: string;
  rejected_count: string;
}

interface ContentEngagementRow {
  period: Date;
  posts_count: string;
  likes_count: string;
  comments_count: string;
}

interface EventInterestRow {
  month: number;
  registrations_count: string;
  events_count: string;
}

interface TopInterestRow {
  interest_id: string;
  interest_name: string;
  user_count: string;
}

interface UserRetentionRow {
  period: Date;
  active_users: string;
  total_users: string;
  retention_rate: string;
}

interface PlatformOverviewRow {
  total_users: string;
  active_users: string;
  pending_users: string;
  total_connections: string;
  pending_connections: string;
  avg_connections_per_user: string;
  total_posts: string;
  total_likes: string;
  total_comments: string;
  total_events: string;
  total_event_registrations: string;
  total_speakers: string;
}

interface SpeakerAnalyticsRow {
  speaker_id: string;
  first_name: string;
  last_name: string;
  events_count: string;
  total_registrations: string;
  avg_registrations_per_event: string;
}

@Injectable()
export class AnalyticsAdminService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_ADMIN_POOL);
  }

  async getUserGrowth(
    startDate: string,
    endDate: string,
    interval: TimeInterval,
  ): Promise<UserGrowthDataPoint[]> {
    this.validateDateRange(startDate, endDate);
    const pool = this.pool;

    try {
      const result = await pool.query<UserGrowthRow>(
        'SELECT * FROM owner.get_user_growth($1, $2, $3)',
        [startDate, endDate, interval],
      );

      return result.rows.map((row) => ({
        date: row.period.toISOString().split('T')[0],
        userCount: parseInt(row.user_count, 10),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getConnectionActivity(
    startDate: string,
    endDate: string,
    interval: TimeInterval,
  ): Promise<ConnectionActivityDataPoint[]> {
    this.validateDateRange(startDate, endDate);
    const pool = this.pool;

    try {
      const result = await pool.query<ConnectionActivityRow>(
        'SELECT * FROM owner.get_connection_activity($1, $2, $3)',
        [startDate, endDate, interval],
      );

      return result.rows.map((row) => ({
        date: row.period.toISOString().split('T')[0],
        sentCount: parseInt(row.sent_count, 10),
        acceptedCount: parseInt(row.accepted_count, 10),
        rejectedCount: parseInt(row.rejected_count, 10),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getContentEngagement(
    startDate: string,
    endDate: string,
    interval: TimeInterval,
  ): Promise<ContentEngagementDataPoint[]> {
    this.validateDateRange(startDate, endDate);
    const pool = this.pool;

    try {
      const result = await pool.query<ContentEngagementRow>(
        'SELECT * FROM owner.get_content_engagement($1, $2, $3)',
        [startDate, endDate, interval],
      );

      return result.rows.map((row) => ({
        date: row.period.toISOString().split('T')[0],
        postsCount: parseInt(row.posts_count, 10),
        likesCount: parseInt(row.likes_count, 10),
        commentsCount: parseInt(row.comments_count, 10),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getEventInterest(year: number): Promise<EventInterestDataPoint[]> {
    const pool = this.pool;

    try {
      const result = await pool.query<EventInterestRow>(
        'SELECT * FROM owner.get_event_interest($1)',
        [year],
      );

      return result.rows.map((row) => ({
        month: row.month,
        registrationsCount: parseInt(row.registrations_count, 10),
        eventsCount: parseInt(row.events_count, 10),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getTopInterests(limit: number = 10): Promise<TopInterestDataPoint[]> {
    const pool = this.pool;

    try {
      const result = await pool.query<TopInterestRow>('SELECT * FROM owner.get_top_interests($1)', [
        limit,
      ]);

      return result.rows.map((row) => ({
        interestId: row.interest_id,
        interestName: row.interest_name,
        userCount: parseInt(row.user_count, 10),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getUserRetention(
    startDate: string,
    endDate: string,
    interval: TimeInterval,
  ): Promise<UserRetentionDataPoint[]> {
    this.validateDateRange(startDate, endDate);
    const pool = this.pool;

    try {
      const result = await pool.query<UserRetentionRow>(
        'SELECT * FROM owner.get_user_retention($1, $2, $3)',
        [startDate, endDate, interval],
      );

      return result.rows.map((row) => ({
        date: row.period.toISOString().split('T')[0],
        activeUsers: parseInt(row.active_users, 10),
        totalUsers: parseInt(row.total_users, 10),
        retentionRate: parseFloat(row.retention_rate),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getPlatformOverview(): Promise<PlatformOverview> {
    const pool = this.pool;

    try {
      const result = await pool.query<PlatformOverviewRow>(
        'SELECT * FROM owner.get_platform_overview()',
      );

      const row = result.rows[0];
      return {
        totalUsers: parseInt(row.total_users, 10),
        activeUsers: parseInt(row.active_users, 10),
        pendingUsers: parseInt(row.pending_users, 10),
        totalConnections: parseInt(row.total_connections, 10),
        pendingConnections: parseInt(row.pending_connections, 10),
        avgConnectionsPerUser: parseFloat(row.avg_connections_per_user),
        totalPosts: parseInt(row.total_posts, 10),
        totalLikes: parseInt(row.total_likes, 10),
        totalComments: parseInt(row.total_comments, 10),
        totalEvents: parseInt(row.total_events, 10),
        totalEventRegistrations: parseInt(row.total_event_registrations, 10),
        totalSpeakers: parseInt(row.total_speakers, 10),
      };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getSpeakerAnalytics(limit: number = 10): Promise<SpeakerAnalyticsDataPoint[]> {
    const pool = this.pool;

    try {
      const result = await pool.query<SpeakerAnalyticsRow>(
        'SELECT * FROM owner.get_speaker_analytics($1)',
        [limit],
      );

      return result.rows.map((row) => ({
        speakerId: row.speaker_id,
        firstName: row.first_name,
        lastName: row.last_name,
        eventsCount: parseInt(row.events_count, 10),
        totalRegistrations: parseInt(row.total_registrations, 10),
        avgRegistrationsPerEvent: parseFloat(row.avg_registrations_per_event),
      }));
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  private validateDateRange(startDate: string, endDate: string): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new InvalidDateRangeError();
    }
  }

  private mapPgError(error: unknown): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (message.includes('Only owner can')) {
        return new AnalyticsAccessDeniedError();
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
