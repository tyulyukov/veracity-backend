import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { registerUser, loginUser, loginAdmin, getInterestIds } from './setup/auth.helper';

describe('Events (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];
  let adminCookies: string[];
  let speakerCookies: string[];
  let user1Cookies: string[];
  let user2Cookies: string[];
  let speakerId: string;
  let user1Id: string;
  let user2Id: string;
  let eventId: string;

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);
    adminCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);

    await registerUser(app, {
      email: 'event-speaker@test.com',
      password: 'password123',
      firstName: 'Event',
      lastName: 'Speaker',
      interestIds: interestIds.slice(0, 2),
    });

    await registerUser(app, {
      email: 'event-user1@test.com',
      password: 'password123',
      firstName: 'EventUser',
      lastName: 'One',
      interestIds: interestIds.slice(0, 2),
    });

    await registerUser(app, {
      email: 'event-user2@test.com',
      password: 'password123',
      firstName: 'EventUser',
      lastName: 'Two',
      interestIds: interestIds.slice(0, 2),
    });

    speakerCookies = await loginUser(app, 'event-speaker@test.com', 'password123');
    user1Cookies = await loginUser(app, 'event-user1@test.com', 'password123');
    user2Cookies = await loginUser(app, 'event-user2@test.com', 'password123');

    speakerId = await getUserId(app, speakerCookies);
    user1Id = await getUserId(app, user1Cookies);
    user2Id = await getUserId(app, user2Cookies);

    await activateUser(app, adminCookies, speakerId);
    await activateUser(app, adminCookies, user1Id);
    await activateUser(app, adminCookies, user2Id);

    await promoteToSpeaker(app, adminCookies, speakerId);

    speakerCookies = await loginUser(app, 'event-speaker@test.com', 'password123');
    user1Cookies = await loginUser(app, 'event-user1@test.com', 'password123');
    user2Cookies = await loginUser(app, 'event-user2@test.com', 'password123');
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /events', () => {
    it('should create event as speaker', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Cookie', speakerCookies)
        .send({
          name: 'Tech Talk: Cloud Architecture',
          isOnline: true,
          eventDate: '2026-03-15T18:00:00Z',
          location: null,
          link: 'https://meet.example.com/tech-talk',
          description: 'Join us for an in-depth discussion on cloud architecture patterns',
          imageUrls: ['https://example.com/image1.jpg'],
          tags: ['technology', 'cloud', 'architecture'],
          limitParticipants: 50,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Tech Talk: Cloud Architecture');
      expect(res.body.isOnline).toBe(true);
      expect(res.body.limitParticipants).toBe(50);
      expect(res.body.participantCount).toBe(0);

      eventId = res.body.id;
    });

    it('should reject event creation by non-speaker', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Cookie', user1Cookies)
        .send({
          name: 'Test Event',
          isOnline: true,
          eventDate: '2026-03-15T18:00:00Z',
        })
        .expect(403);
    });

    it('should reject unauthenticated event creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/events')
        .send({
          name: 'Test Event',
          isOnline: true,
          eventDate: '2026-03-15T18:00:00Z',
        })
        .expect(401);
    });
  });

  describe('GET /events', () => {
    it('should get all events', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.events).toBeInstanceOf(Array);
      expect(res.body.events.length).toBeGreaterThan(0);
      expect(res.body.events[0].id).toBe(eventId);
      expect(res.body.events[0].speaker).toBeDefined();
      expect(res.body.events[0].isRegistered).toBe(false);
    });

    it('should get events with registered filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events?filter=registered')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.events).toBeInstanceOf(Array);
      expect(res.body.events.length).toBe(0);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events?limit=1')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.events.length).toBe(1);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/events').expect(401);
    });
  });

  describe('GET /events/:eventId', () => {
    it('should get event by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${eventId}`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.id).toBe(eventId);
      expect(res.body.name).toBe('Tech Talk: Cloud Architecture');
      expect(res.body.description).toBeDefined();
      expect(res.body.tags).toBeDefined();
      expect(res.body.isRegistered).toBe(false);
    });

    it('should reject non-existent event', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/events/00000000-0000-0000-0000-000000000000')
        .set('Cookie', user1Cookies)
        .expect(404);
    });
  });

  describe('GET /events/my', () => {
    it('should get speaker own events', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events/my')
        .set('Cookie', speakerCookies)
        .expect(200);

      expect(res.body.events).toBeInstanceOf(Array);
      expect(res.body.events.length).toBeGreaterThan(0);
      expect(res.body.events[0].id).toBe(eventId);
      expect(res.body.events[0].participantCount).toBe(0);
    });

    it('should reject non-speaker request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/events/my')
        .set('Cookie', user1Cookies)
        .expect(403);
    });
  });

  describe('GET /events/my/:eventId', () => {
    it('should get speaker specific event', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/my/${eventId}`)
        .set('Cookie', speakerCookies)
        .expect(200);

      expect(res.body.id).toBe(eventId);
      expect(res.body.description).toBeDefined();
      expect(res.body.tags).toBeDefined();
    });

    it('should reject non-speaker request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/events/my/${eventId}`)
        .set('Cookie', user1Cookies)
        .expect(403);
    });
  });

  describe('POST /events/:eventId/register', () => {
    it('should register user for event', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/register`)
        .set('Cookie', user1Cookies)
        .send({ comment: 'Looking forward to it!' })
        .expect(201);

      expect(res.body.eventId).toBe(eventId);
      expect(res.body.userId).toBe(user1Id);
      expect(res.body.comment).toBe('Looking forward to it!');
    });

    it('should reject duplicate registration', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/register`)
        .set('Cookie', user1Cookies)
        .send({})
        .expect(409);
    });

    it('should reject speaker self-registration', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/register`)
        .set('Cookie', speakerCookies)
        .send({})
        .expect(403);
    });

    it('should register second user', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/register`)
        .set('Cookie', user2Cookies)
        .send({})
        .expect(201);
    });
  });

  describe('GET /events with registered filter after registration', () => {
    it('should get registered events', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/events?filter=registered')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.events.length).toBeGreaterThan(0);
      expect(res.body.events[0].id).toBe(eventId);
      expect(res.body.events[0].isRegistered).toBe(true);
    });
  });

  describe('GET /events/:eventId/participants', () => {
    it('should get event participants as speaker', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/events/${eventId}/participants`)
        .set('Cookie', speakerCookies)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body[0].id).toBeDefined();
      expect(res.body[0].firstName).toBeDefined();
      expect(res.body[0].comment).toBeDefined();
    });

    it('should reject non-speaker request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/events/${eventId}/participants`)
        .set('Cookie', user1Cookies)
        .expect(403);
    });
  });

  describe('PATCH /events/:eventId', () => {
    it('should update event as speaker', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}`)
        .set('Cookie', speakerCookies)
        .send({
          name: 'Updated Tech Talk',
          limitParticipants: 100,
        })
        .expect(200);

      expect(res.body.name).toBe('Updated Tech Talk');
      expect(res.body.limitParticipants).toBe(100);
    });

    it('should reject update by non-speaker', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}`)
        .set('Cookie', user1Cookies)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should reject setting limit below current participants', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/events/${eventId}`)
        .set('Cookie', speakerCookies)
        .send({ limitParticipants: 1 })
        .expect(500);
    });
  });

  describe('DELETE /events/:eventId/register', () => {
    it('should unregister from event', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/events/${eventId}/register`)
        .set('Cookie', user1Cookies)
        .expect(204);
    });

    it('should reject duplicate unregister', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/events/${eventId}/register`)
        .set('Cookie', user1Cookies)
        .expect(404);
    });
  });

  describe('Event capacity limit', () => {
    it('should reject registration when event is full', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Cookie', speakerCookies)
        .send({
          name: 'Limited Event',
          isOnline: true,
          eventDate: '2026-04-15T18:00:00Z',
          limitParticipants: 1,
        })
        .expect(201);

      const limitedEventId = res.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/events/${limitedEventId}/register`)
        .set('Cookie', user1Cookies)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/events/${limitedEventId}/register`)
        .set('Cookie', user2Cookies)
        .send({})
        .expect(409);
    });
  });

  describe('DELETE /events/:eventId', () => {
    it('should delete event as speaker', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Cookie', speakerCookies)
        .send({
          name: 'Event To Delete',
          isOnline: true,
          eventDate: '2026-05-15T18:00:00Z',
        })
        .expect(201);

      const deleteEventId = res.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/events/${deleteEventId}`)
        .set('Cookie', speakerCookies)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/events/${deleteEventId}`)
        .set('Cookie', user1Cookies)
        .expect(404);
    });

    it('should reject delete by non-speaker', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/events/${eventId}`)
        .set('Cookie', user1Cookies)
        .expect(403);
    });
  });
});

async function getUserId(app: INestApplication, cookies: string[]): Promise<string> {
  const res = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set('Cookie', cookies)
    .expect(200);
  return res.body.id;
}

async function activateUser(
  app: INestApplication,
  adminCookies: string[],
  userId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/users/${userId}/status`)
    .set('Cookie', adminCookies)
    .send({ status: 'active' })
    .expect(204);
}

async function promoteToSpeaker(
  app: INestApplication,
  adminCookies: string[],
  userId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/users/${userId}/role`)
    .set('Cookie', adminCookies)
    .send({ role: 'speaker' })
    .expect(204);
}
