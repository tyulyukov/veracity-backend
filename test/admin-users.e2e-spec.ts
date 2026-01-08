import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { registerUser, loginAdmin, getInterestIds } from './setup/auth.helper';

describe('Admin Users (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];
  let adminCookies: string[];
  let testUserId: string;

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);
    adminCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);

    await registerUser(app, {
      email: 'admintest@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'Test',
      interestIds: interestIds.slice(0, 1),
    });

    const usersRes = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Cookie', adminCookies)
      .expect(200);

    testUserId = usersRes.body.users.find(
      (u: { email: string }) => u.email === 'admintest@test.com',
    ).id;
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /admin/users', () => {
    it('should return paginated users list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('should include connection stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.users.length).toBeGreaterThan(0);
      const user = res.body.users[0];
      expect(user).toHaveProperty('totalConnections');
      expect(user).toHaveProperty('pendingSentCount');
      expect(user).toHaveProperty('pendingReceivedCount');
      expect(typeof user.totalConnections).toBe('number');
      expect(typeof user.pendingSentCount).toBe('number');
      expect(typeof user.pendingReceivedCount).toBe('number');
    });

    it('should filter by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?status=pending')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.users.every((u: { status: string }) => u.status === 'pending')).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('should update user status to active', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${testUserId}/status`)
        .set('Cookie', adminCookies)
        .send({ status: 'active' })
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', adminCookies)
        .expect(200);

      const user = res.body.users.find((u: { id: string }) => u.id === testUserId);
      expect(user.status).toBe('active');
    });

    it('should update user status to inactive', async () => {
      await registerUser(app, {
        email: 'toinactive@test.com',
        password: 'password123',
        firstName: 'To',
        lastName: 'Inactive',
        interestIds: interestIds.slice(0, 1),
      });

      const usersRes = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', adminCookies);

      const userId = usersRes.body.users.find(
        (u: { email: string }) => u.email === 'toinactive@test.com',
      ).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${userId}/status`)
        .set('Cookie', adminCookies)
        .send({ status: 'inactive' })
        .expect(204);

      const verifyRes = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', adminCookies);

      const user = verifyRes.body.users.find((u: { id: string }) => u.id === userId);
      expect(user.status).toBe('inactive');
    });

    it('should reject invalid status', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${testUserId}/status`)
        .set('Cookie', adminCookies)
        .send({ status: 'invalid' })
        .expect(400);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('should update user role to speaker', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Cookie', adminCookies)
        .send({ role: 'speaker' })
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', adminCookies);

      const user = res.body.users.find((u: { id: string }) => u.id === testUserId);
      expect(user.role).toBe('speaker');
    });

    it('should update user role back to standard_user', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Cookie', adminCookies)
        .send({ role: 'standard_user' })
        .expect(204);
    });

    it('should reject invalid role', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Cookie', adminCookies)
        .send({ role: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should return user by id with connection stats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${testUserId}`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.id).toBe(testUserId);
      expect(res.body).toHaveProperty('totalConnections');
      expect(res.body).toHaveProperty('pendingSentCount');
      expect(res.body).toHaveProperty('pendingReceivedCount');
      expect(typeof res.body.totalConnections).toBe('number');
      expect(typeof res.body.pendingSentCount).toBe('number');
      expect(typeof res.body.pendingReceivedCount).toBe('number');
    });
  });

  describe('GET /admin/users/:id/events', () => {
    let speakerId: string;
    let speakerCookies: string[];
    let regularUserId: string;
    let regularUserCookies: string[];
    let eventId: string;

    beforeAll(async () => {
      await registerUser(app, {
        email: 'admin-event-speaker@test.com',
        password: 'password123',
        firstName: 'EventSpeaker',
        lastName: 'Admin',
        interestIds: interestIds.slice(0, 1),
      });

      await registerUser(app, {
        email: 'admin-event-user@test.com',
        password: 'password123',
        firstName: 'EventUser',
        lastName: 'Admin',
        interestIds: interestIds.slice(0, 1),
      });

      const speakerLoginRes = await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'admin-event-speaker@test.com', password: 'password123' })
        .expect(200);
      speakerCookies = speakerLoginRes.headers['set-cookie'] as unknown as string[];

      const regularUserLoginRes = await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'admin-event-user@test.com', password: 'password123' })
        .expect(200);
      regularUserCookies = regularUserLoginRes.headers['set-cookie'] as unknown as string[];

      const speakerMeRes = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', speakerCookies)
        .expect(200);
      speakerId = speakerMeRes.body.id;

      const regularUserMeRes = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', regularUserCookies)
        .expect(200);
      regularUserId = regularUserMeRes.body.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${speakerId}/status`)
        .set('Cookie', adminCookies)
        .send({ status: 'active' })
        .expect(204);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${regularUserId}/status`)
        .set('Cookie', adminCookies)
        .send({ status: 'active' })
        .expect(204);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${speakerId}/role`)
        .set('Cookie', adminCookies)
        .send({ role: 'speaker' })
        .expect(204);

      const speakerLoginRes2 = await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'admin-event-speaker@test.com', password: 'password123' })
        .expect(200);
      speakerCookies = speakerLoginRes2.headers['set-cookie'] as unknown as string[];

      const regularUserLoginRes2 = await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'admin-event-user@test.com', password: 'password123' })
        .expect(200);
      regularUserCookies = regularUserLoginRes2.headers['set-cookie'] as unknown as string[];

      const createEventRes = await request(app.getHttpServer())
        .post('/api/v1/events')
        .set('Cookie', speakerCookies)
        .send({
          name: 'Admin Test Event',
          isOnline: true,
          eventDate: '2026-06-15T18:00:00Z',
          link: 'https://example.com',
          description: 'Test event for admin',
        })
        .expect(201);
      eventId = createEventRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/events/${eventId}/register`)
        .set('Cookie', regularUserCookies)
        .send({ comment: 'Excited to attend!' })
        .expect(201);
    });

    it('should return empty array for user with no event relations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${testUserId}/events`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBe(0);
      expect(res.body.total).toBe(0);
    });

    it('should return created events for speaker', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${speakerId}/events`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);

      const createdEvent = res.body.events.find(
        (e: { eventRelationType: string }) => e.eventRelationType === 'created',
      );
      expect(createdEvent).toBeDefined();
      expect(createdEvent.eventId).toBe(eventId);
      expect(createdEvent.name).toBe('Admin Test Event');
      expect(createdEvent.userId).toBe(speakerId);
      expect(createdEvent.registrationComment).toBeNull();
      expect(createdEvent.registrationCreatedAt).toBeNull();
    });

    it('should return registered events for regular user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${regularUserId}/events`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);

      const registeredEvent = res.body.events.find(
        (e: { eventRelationType: string }) => e.eventRelationType === 'registered',
      );
      expect(registeredEvent).toBeDefined();
      expect(registeredEvent.eventId).toBe(eventId);
      expect(registeredEvent.name).toBe('Admin Test Event');
      expect(registeredEvent.userId).toBe(regularUserId);
      expect(registeredEvent.registrationComment).toBe('Excited to attend!');
      expect(registeredEvent.registrationCreatedAt).toBeDefined();
    });

    it('should support pagination with limit parameter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${speakerId}/events?limit=1`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('total');
      expect(res.body.events.length).toBeLessThanOrEqual(1);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should support pagination with offset parameter', async () => {
      const fullRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${speakerId}/events`)
        .set('Cookie', adminCookies)
        .expect(200);

      if (fullRes.body.total > 0) {
        const offsetRes = await request(app.getHttpServer())
          .get(`/api/v1/admin/users/${speakerId}/events?offset=0&limit=1`)
          .set('Cookie', adminCookies)
          .expect(200);

        expect(offsetRes.body.events.length).toBeLessThanOrEqual(1);
        expect(offsetRes.body.total).toBe(fullRes.body.total);
      }
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users/00000000-0000-0000-0000-000000000000/events')
        .set('Cookie', adminCookies)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${testUserId}/events`)
        .expect(401);
    });
  });
});
