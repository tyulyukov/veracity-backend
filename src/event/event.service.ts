import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Pool, DatabaseError } from 'pg';
import { CLS_USER_POOL } from '@/user-auth/user-jwt.strategy';
import {
  Event,
  EventListItem,
  EventParticipant,
  EventRegistration,
  EventWithRegistrationStatus,
  SpeakerEvent,
  Speaker,
} from './domain/event.type';
import { EventNotFoundError } from './domain/event-not-found.error';
import { EventFullError } from './domain/event-full.error';
import { AlreadyRegisteredError } from './domain/already-registered.error';
import { RegistrationNotFoundError } from './domain/registration-not-found.error';
import { UnauthorizedEventAccessError } from './domain/unauthorized-event-access.error';
import { UserNotFoundError } from '@/user/domain/user-not-found.error';
import { UserNotActiveError } from '@/user/domain/user-not-active.error';

interface DbEventRow {
  id: string;
  speaker_id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  description: string | null;
  image_urls: string[];
  tags: string[];
  limit_participants: number | null;
  created_at: Date;
}

interface DbEventWithDetailsRow extends DbEventRow {
  participant_count: number;
  speaker_id: string;
  speaker_first_name: string;
  speaker_last_name: string;
  speaker_avatar_url: string | null;
  speaker_role: string;
}

interface DbEventWithRegistrationRow extends DbEventWithDetailsRow {
  is_registered: boolean;
}

interface DbEventListItemRow {
  id: string;
  name: string;
  is_online: boolean;
  event_date: Date;
  location: string | null;
  link: string | null;
  image_urls: string[];
  limit_participants: number | null;
  participant_count: number;
  speaker_id: string;
  speaker_first_name: string;
  speaker_last_name: string;
  speaker_avatar_url: string | null;
  speaker_role: string;
  is_registered: boolean;
}

interface DbSpeakerEventRow {
  id: string;
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
}

interface DbEventParticipantRow {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
  comment: string | null;
  registration_created_at: Date;
}

interface DbEventRegistrationRow {
  event_id: string;
  user_id: string;
  comment: string | null;
  created_at: Date;
}

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class EventService {
  constructor(private readonly cls: ClsService) {}

  private get pool(): Pool {
    return this.cls.get<Pool>(CLS_USER_POOL);
  }

  async getEvents(
    filter: 'all' | 'registered',
    cursor?: string,
    limit?: number,
  ): Promise<{ events: EventListItem[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      if (filter === 'registered') {
        conditions.push('is_registered = true');
      }

      if (cursor) {
        const [eventDate, id] = cursor.split(',');
        conditions.push(
          `(event_date, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(eventDate, id);
        paramIndex += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT id, name, is_online, event_date, location, link, image_urls,
               limit_participants, participant_count,
               speaker_id, speaker_first_name, speaker_last_name, speaker_avatar_url, speaker_role,
               is_registered
        FROM "user".events_v
        ${whereClause}
        ORDER BY event_date DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbEventListItemRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const eventDate =
          lastRow.event_date instanceof Date ? lastRow.event_date : new Date(lastRow.event_date);
        nextCursor = `${eventDate.toISOString()},${lastRow.id}`;
      }

      const events = rows.map((row) => this.mapEventListItemRow(row));
      return { events, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getEventById(eventId: string): Promise<EventWithRegistrationStatus> {
    try {
      const result = await this.pool.query<DbEventWithRegistrationRow>(
        `SELECT * FROM "user".events_v WHERE id = $1`,
        [eventId],
      );

      if (result.rows.length === 0) {
        throw new EventNotFoundError(eventId);
      }

      return this.mapEventWithRegistrationRow(result.rows[0]);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async getMyEvents(
    cursor?: string,
    limit?: number,
  ): Promise<{ events: SpeakerEvent[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      if (cursor) {
        const [eventDate, id] = cursor.split(',');
        conditions.push(
          `(event_date, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(eventDate, id);
        paramIndex += 2;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT * FROM speaker.my_events_v
        ${whereClause}
        ORDER BY event_date DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbSpeakerEventRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const eventDate =
          lastRow.event_date instanceof Date ? lastRow.event_date : new Date(lastRow.event_date);
        nextCursor = `${eventDate.toISOString()},${lastRow.id}`;
      }

      const events = rows.map((row) => this.mapSpeakerEventRow(row));
      return { events, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getMyEventById(eventId: string): Promise<SpeakerEvent> {
    try {
      const result = await this.pool.query<DbSpeakerEventRow>(
        `SELECT * FROM speaker.my_events_v WHERE id = $1`,
        [eventId],
      );

      if (result.rows.length === 0) {
        throw new EventNotFoundError(eventId);
      }

      return this.mapSpeakerEventRow(result.rows[0]);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async createEvent(
    name: string,
    isOnline: boolean,
    eventDate: string,
    location?: string,
    link?: string,
    description?: string,
    imageUrls?: string[],
    tags?: string[],
    limitParticipants?: number,
  ): Promise<Event> {
    try {
      const result = await this.pool.query<DbEventRow>(
        `SELECT * FROM speaker.create_event($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          name,
          isOnline,
          eventDate,
          location ?? null,
          link ?? null,
          description ?? null,
          imageUrls ?? [],
          tags ?? [],
          limitParticipants ?? null,
        ],
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to create event');
      }

      return this.mapEventRow(result.rows[0]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async updateEvent(
    eventId: string,
    name: string,
    isOnline: boolean,
    eventDate: string,
    location?: string,
    link?: string,
    description?: string,
    imageUrls?: string[],
    tags?: string[],
    limitParticipants?: number,
  ): Promise<Event> {
    try {
      const result = await this.pool.query<DbEventRow>(
        `SELECT * FROM speaker.update_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          eventId,
          name,
          isOnline,
          eventDate,
          location ?? null,
          link ?? null,
          description ?? null,
          imageUrls ?? [],
          tags ?? [],
          limitParticipants ?? null,
        ],
      );

      if (result.rows.length === 0) {
        throw new EventNotFoundError(eventId);
      }

      return this.mapEventRow(result.rows[0]);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw error;
      }
      throw this.mapPgError(error);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT speaker.delete_event($1)`, [eventId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async registerForEvent(eventId: string, comment?: string): Promise<EventRegistration> {
    try {
      const result = await this.pool.query<DbEventRegistrationRow>(
        `SELECT * FROM "user".register_for_event($1, $2)`,
        [eventId, comment ?? null],
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to register for event');
      }

      return this.mapEventRegistrationRow(result.rows[0]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async unregisterFromEvent(eventId: string): Promise<void> {
    try {
      await this.pool.query(`SELECT "user".unregister_from_event($1)`, [eventId]);
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  async getEventParticipants(
    eventId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ participants: EventParticipant[]; nextCursor: string | null }> {
    try {
      const params: (string | null)[] = [eventId];
      const conditions: string[] = ['event_id = $1'];
      let paramIndex = 2;
      const pageSize = limit ?? DEFAULT_PAGE_SIZE;

      if (cursor) {
        const [registrationCreatedAt, id] = cursor.split(',');
        conditions.push(
          `(registration_created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`,
        );
        params.push(registrationCreatedAt, id);
        paramIndex += 2;
      }

      const whereClause = conditions.join(' AND ');

      const sql = `
        SELECT * FROM speaker.event_participants_v
        WHERE ${whereClause}
        ORDER BY registration_created_at DESC, id DESC
        LIMIT ${pageSize + 1}
      `;

      const result = await this.pool.query<DbEventParticipantRow>(sql, params);

      let nextCursor: string | null = null;
      const rows = result.rows;

      if (rows.length > pageSize) {
        rows.pop();
        const lastRow = rows[rows.length - 1];
        const registrationCreatedAt =
          lastRow.registration_created_at instanceof Date
            ? lastRow.registration_created_at
            : new Date(lastRow.registration_created_at);
        nextCursor = `${registrationCreatedAt.toISOString()},${lastRow.id}`;
      }

      const participants = rows.map((row) => this.mapEventParticipantRow(row));
      return { participants, nextCursor };
    } catch (error) {
      throw this.mapPgError(error);
    }
  }

  private mapEventRow(row: DbEventRow): Event {
    return {
      id: row.id,
      speaker_id: row.speaker_id,
      name: row.name,
      is_online: row.is_online,
      event_date: row.event_date instanceof Date ? row.event_date : new Date(row.event_date),
      location: row.location,
      link: row.link,
      description: row.description,
      image_urls: row.image_urls,
      tags: row.tags,
      limit_participants: row.limit_participants,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    };
  }

  private mapSpeaker(row: DbEventWithDetailsRow): Speaker {
    return {
      id: row.speaker_id,
      first_name: row.speaker_first_name,
      last_name: row.speaker_last_name,
      avatar_url: row.speaker_avatar_url,
      role: row.speaker_role,
    };
  }

  private mapEventWithRegistrationRow(
    row: DbEventWithRegistrationRow,
  ): EventWithRegistrationStatus {
    return {
      id: row.id,
      speaker_id: row.speaker_id,
      name: row.name,
      is_online: row.is_online,
      event_date: row.event_date instanceof Date ? row.event_date : new Date(row.event_date),
      location: row.location,
      link: row.link,
      description: row.description,
      image_urls: row.image_urls,
      tags: row.tags,
      limit_participants: row.limit_participants,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      participant_count: row.participant_count,
      speaker: this.mapSpeaker(row),
      is_registered: row.is_registered,
    };
  }

  private mapEventListItemRow(row: DbEventListItemRow): EventListItem {
    return {
      id: row.id,
      name: row.name,
      is_online: row.is_online,
      event_date: row.event_date instanceof Date ? row.event_date : new Date(row.event_date),
      location: row.location,
      link: row.link,
      image_urls: row.image_urls,
      limit_participants: row.limit_participants,
      participant_count: row.participant_count,
      speaker: {
        id: row.speaker_id,
        first_name: row.speaker_first_name,
        last_name: row.speaker_last_name,
        avatar_url: row.speaker_avatar_url,
        role: row.speaker_role,
      },
      is_registered: row.is_registered,
    };
  }

  private mapSpeakerEventRow(row: DbSpeakerEventRow): SpeakerEvent {
    return {
      id: row.id,
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
    };
  }

  private mapEventParticipantRow(row: DbEventParticipantRow): EventParticipant {
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      role: row.role,
      comment: row.comment,
      registration_created_at:
        row.registration_created_at instanceof Date
          ? row.registration_created_at
          : new Date(row.registration_created_at),
    };
  }

  private mapEventRegistrationRow(row: DbEventRegistrationRow): EventRegistration {
    return {
      event_id: row.event_id,
      user_id: row.user_id,
      comment: row.comment,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    };
  }

  private mapPgError(error: unknown): Error {
    if (error instanceof DatabaseError || (error instanceof Error && 'message' in error)) {
      const message = (error as Error).message;

      if (message.includes('Event not found')) {
        return new EventNotFoundError();
      }
      if (message.includes('Event is full')) {
        return new EventFullError();
      }
      if (message.includes('Already registered for this event')) {
        return new AlreadyRegisteredError();
      }
      if (message.includes('Registration not found')) {
        return new RegistrationNotFoundError();
      }
      if (
        message.includes('You can only update your own events') ||
        message.includes('You can only delete your own events') ||
        message.includes('Cannot register for your own event') ||
        message.includes('Access denied')
      ) {
        return new UnauthorizedEventAccessError();
      }
      if (message.includes('User not found')) {
        return new UserNotFoundError();
      }
      if (message.includes('User is not active')) {
        return new UserNotActiveError();
      }
      if (message.includes('Only speakers can create events')) {
        return new UnauthorizedEventAccessError();
      }
    }

    return error as Error;
  }
}
