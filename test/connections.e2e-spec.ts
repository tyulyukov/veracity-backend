import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { registerUser, loginUser, loginAdmin, getInterestIds } from './setup/auth.helper';

describe('Connections (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];
  let adminCookies: string[];
  let user1Cookies: string[];
  let user2Cookies: string[];
  let user3Cookies: string[];
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);
    adminCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);

    await registerUser(app, {
      email: 'conn-user1@test.com',
      password: 'password123',
      firstName: 'ConnUser',
      lastName: 'One',
      interestIds: interestIds.slice(0, 2),
    });

    await registerUser(app, {
      email: 'conn-user2@test.com',
      password: 'password123',
      firstName: 'ConnUser',
      lastName: 'Two',
      interestIds: interestIds.slice(0, 2),
    });

    await registerUser(app, {
      email: 'conn-user3@test.com',
      password: 'password123',
      firstName: 'ConnUser',
      lastName: 'Three',
      interestIds: interestIds.slice(0, 2),
    });

    user1Cookies = await loginUser(app, 'conn-user1@test.com', 'password123');
    user2Cookies = await loginUser(app, 'conn-user2@test.com', 'password123');
    user3Cookies = await loginUser(app, 'conn-user3@test.com', 'password123');

    user1Id = await getUserId(app, user1Cookies);
    user2Id = await getUserId(app, user2Cookies);
    user3Id = await getUserId(app, user3Cookies);

    await activateUser(app, adminCookies, user1Id);
    await activateUser(app, adminCookies, user2Id);
    await activateUser(app, adminCookies, user3Id);

    user1Cookies = await loginUser(app, 'conn-user1@test.com', 'password123');
    user2Cookies = await loginUser(app, 'conn-user2@test.com', 'password123');
    user3Cookies = await loginUser(app, 'conn-user3@test.com', 'password123');
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /connections/:targetUserId', () => {
    it('should send connection request', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/connections/${user2Id}`)
        .set('Cookie', user1Cookies)
        .expect(201);

      expect(res.body.requesterUserId).toBe(user1Id);
      expect(res.body.targetUserId).toBe(user2Id);
      expect(res.body.status).toBe('pending');
      expect(res.body.wasAutoApproved).toBe(false);
    });

    it('should reject duplicate connection request', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/connections/${user2Id}`)
        .set('Cookie', user1Cookies)
        .expect(409);
    });

    it('should reject self-connection', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/connections/${user1Id}`)
        .set('Cookie', user1Cookies)
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).post(`/api/v1/connections/${user2Id}`).expect(401);
    });

    it('should auto-approve when mutual pending request exists', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/connections/${user1Id}`)
        .set('Cookie', user2Cookies)
        .expect(201);

      expect(res.body.status).toBe('approved');
      expect(res.body.wasAutoApproved).toBe(true);
    });
  });

  describe('DELETE /connections/:targetUserId', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/connections/${user3Id}`)
        .set('Cookie', user1Cookies)
        .expect(201);
    });

    it('should delete pending connection request', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/connections/${user3Id}`)
        .set('Cookie', user1Cookies)
        .expect(200);
    });

    it('should reject deleting non-existent request', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/connections/${user3Id}`)
        .set('Cookie', user1Cookies)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).delete(`/api/v1/connections/${user3Id}`).expect(401);
    });
  });

  describe('PATCH /connections/:requesterId/respond', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/connections/${user1Id}`)
        .set('Cookie', user3Cookies)
        .expect(201);
    });

    it('should approve connection request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/connections/${user3Id}/respond`)
        .set('Cookie', user1Cookies)
        .send({ response: 'approved' })
        .expect(200);

      expect(res.body.status).toBe('approved');
    });

    it('should reject responding to non-pending request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/connections/${user3Id}/respond`)
        .set('Cookie', user1Cookies)
        .send({ response: 'approved' })
        .expect(400);
    });

    it('should reject invalid response', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/connections/${user3Id}/respond`)
        .set('Cookie', user1Cookies)
        .send({ response: 'invalid' })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/connections/${user3Id}/respond`)
        .send({ response: 'approved' })
        .expect(401);
    });
  });

  describe('GET /users - connection flags', () => {
    it('should return users with connection flags', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);

      const user2InList = res.body.users.find((u: { id: string }) => u.id === user2Id);
      if (user2InList) {
        expect(user2InList).toHaveProperty('isConnected');
        expect(user2InList).toHaveProperty('hasOutgoingRequest');
        expect(user2InList).toHaveProperty('hasIncomingRequest');
        expect(user2InList.isConnected).toBe(true);
      }
    });

    it('should filter by connection status - connected', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users?connectionFilter=connected')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.users).toBeDefined();
      for (const user of res.body.users) {
        expect(user.isConnected).toBe(true);
      }
    });
  });

  describe('GET /users/:id - connection detail', () => {
    it('should return user detail with contact info when connected', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', user2Cookies)
        .send({ contactInfo: { phone: '123456789' } })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${user2Id}`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.isConnected).toBe(true);
      expect(res.body.contactInfo).toBeDefined();
      expect(res.body.contactInfo.phone).toBe('123456789');
    });

    it('should not return contact info when not connected', async () => {
      await registerUser(app, {
        email: 'conn-user4@test.com',
        password: 'password123',
        firstName: 'ConnUser',
        lastName: 'Four',
        interestIds: interestIds.slice(0, 1),
      });

      const user4Cookies = await loginUser(app, 'conn-user4@test.com', 'password123');
      const user4Id = await getUserId(app, user4Cookies);
      await activateUser(app, adminCookies, user4Id);

      const freshUser4Cookies = await loginUser(app, 'conn-user4@test.com', 'password123');

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', freshUser4Cookies)
        .send({ contactInfo: { email: 'secret@test.com' } })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${user4Id}`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.isConnected).toBe(false);
      expect(res.body.contactInfo).toBeNull();
    });
  });

  describe('Ignore connection request', () => {
    it('should ignore connection request', async () => {
      await registerUser(app, {
        email: 'conn-user5@test.com',
        password: 'password123',
        firstName: 'ConnUser',
        lastName: 'Five',
        interestIds: interestIds.slice(0, 1),
      });

      const user5Cookies = await loginUser(app, 'conn-user5@test.com', 'password123');
      const user5Id = await getUserId(app, user5Cookies);
      await activateUser(app, adminCookies, user5Id);

      const freshUser5Cookies = await loginUser(app, 'conn-user5@test.com', 'password123');

      await request(app.getHttpServer())
        .post(`/api/v1/connections/${user1Id}`)
        .set('Cookie', freshUser5Cookies)
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/connections/${user5Id}/respond`)
        .set('Cookie', user1Cookies)
        .send({ response: 'ignored' })
        .expect(200);

      expect(res.body.status).toBe('ignored');
    });
  });

  describe('GET /connections/users/:userId', () => {
    it('should return approved connections for own profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/connections/users/${user1Id}`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);

      const connectedUser = res.body.users.find(
        (u: { id: string }) => u.id === user2Id || u.id === user3Id,
      );
      expect(connectedUser).toBeDefined();
      expect(connectedUser).toHaveProperty('firstName');
      expect(connectedUser).toHaveProperty('lastName');
      expect(connectedUser).toHaveProperty('isConnected');
      expect(connectedUser).toHaveProperty('connectionCreatedAt');
    });

    it('should return approved connections for other user profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/connections/users/${user2Id}`)
        .set('Cookie', user3Cookies)
        .expect(200);

      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);

      const connectedUser = res.body.users.find((u: { id: string }) => u.id === user1Id);
      if (connectedUser) {
        expect(connectedUser).toHaveProperty('firstName');
        expect(connectedUser).toHaveProperty('isConnected');
      }
    });

    it('should return empty array for user with no connections', async () => {
      await registerUser(app, {
        email: 'conn-user6@test.com',
        password: 'password123',
        firstName: 'ConnUser',
        lastName: 'Six',
        interestIds: interestIds.slice(0, 1),
      });

      const user6Cookies = await loginUser(app, 'conn-user6@test.com', 'password123');
      const user6Id = await getUserId(app, user6Cookies);
      await activateUser(app, adminCookies, user6Id);

      const freshUser6Cookies = await loginUser(app, 'conn-user6@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .get(`/api/v1/connections/users/${user6Id}`)
        .set('Cookie', freshUser6Cookies)
        .expect(200);

      expect(res.body.users).toBeDefined();
      expect(res.body.users.length).toBe(0);
      expect(res.body.nextCursor).toBeNull();
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/connections/users/${user1Id}?limit=1`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.users).toBeDefined();
      expect(res.body.users.length).toBeLessThanOrEqual(1);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get(`/api/v1/connections/users/${user1Id}`).expect(401);
    });
  });

  describe('GET /users/me - totalConnections', () => {
    it('should return totalConnections in user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body).toHaveProperty('totalConnections');
      expect(typeof res.body.totalConnections).toBe('number');
      expect(res.body.totalConnections).toBeGreaterThan(0);
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
