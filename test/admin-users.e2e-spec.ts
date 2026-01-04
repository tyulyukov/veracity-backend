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
});
