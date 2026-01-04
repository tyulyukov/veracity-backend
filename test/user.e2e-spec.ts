import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { registerUser, loginUser, loginAdmin, getInterestIds } from './setup/auth.helper';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];
  let userCookies: string[];
  let adminCookies: string[];

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);

    await registerUser(app, {
      email: 'user1@test.com',
      password: 'password123',
      firstName: 'User',
      lastName: 'One',
      interestIds: interestIds.slice(0, 2),
    });

    userCookies = await loginUser(app, 'user1@test.com', 'password123');
    adminCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);

    await request(app.getHttpServer())
      .patch('/api/v1/admin/users/' + (await getUserId(app, userCookies)) + '/status')
      .set('Cookie', adminCookies)
      .send({ status: 'active' })
      .expect(204);

    userCookies = await loginUser(app, 'user1@test.com', 'password123');
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', userCookies)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('user1@test.com');
      expect(res.body.firstName).toBe('User');
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update current user profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', userCookies)
        .send({ firstName: 'Updated' })
        .expect(200);

      expect(res.body.firstName).toBe('Updated');
    });
  });

  describe('GET /users', () => {
    beforeAll(async () => {
      await registerUser(app, {
        email: 'user2@test.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'Two',
        interestIds: interestIds.slice(0, 1),
      });

      const user2Id = await getUserIdByEmail(app, adminCookies, 'user2@test.com');
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user2Id}/status`)
        .set('Cookie', adminCookies)
        .send({ status: 'active' })
        .expect(204);
    });

    it('should return list of active users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', userCookies)
        .expect(200);

      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('should reject pending user', async () => {
      await registerUser(app, {
        email: 'pending@test.com',
        password: 'password123',
        firstName: 'Pending',
        lastName: 'User',
        interestIds: interestIds.slice(0, 1),
      });
      const pendingCookies = await loginUser(app, 'pending@test.com', 'password123');

      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', pendingCookies)
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

async function getUserIdByEmail(
  app: INestApplication,
  adminCookies: string[],
  email: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .get('/api/v1/admin/users')
    .set('Cookie', adminCookies)
    .expect(200);
  const user = res.body.users.find((u: { email: string }) => u.email === email);
  return user.id;
}
