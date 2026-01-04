import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { loginAdmin } from './setup/auth.helper';

describe('Admin Moderators (e2e)', () => {
  let app: INestApplication;
  let ownerCookies: string[];

  beforeAll(async () => {
    app = await setupTestApp();
    ownerCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /admin/me', () => {
    it('should return current admin info', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/me')
        .set('Cookie', ownerCookies)
        .expect(200);

      expect(res.body).toHaveProperty('email', process.env.OWNER_EMAIL);
      expect(res.body).toHaveProperty('role', 'owner');
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/me').expect(401);
    });
  });

  describe('GET /admin/moderators', () => {
    it('should return paginated moderators list (owner only)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/moderators')
        .set('Cookie', ownerCookies)
        .expect(200);

      expect(res.body).toHaveProperty('moderators');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.moderators)).toBe(true);
    });

    it('should reject non-owner moderator', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/moderators')
        .set('Cookie', ownerCookies)
        .send({ email: 'mod@test.com', password: 'modpassword123' })
        .expect(201);

      const modCookies = await loginAdmin(app, 'mod@test.com', 'modpassword123');

      await request(app.getHttpServer())
        .get('/api/v1/admin/moderators')
        .set('Cookie', modCookies)
        .expect(403);
    });
  });

  describe('POST /admin/moderators', () => {
    it('should create a moderator (owner only)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/moderators')
        .set('Cookie', ownerCookies)
        .send({ email: 'newmod@test.com', password: 'modpassword123' })
        .expect(201);

      expect(res.body).toHaveProperty('email', 'newmod@test.com');
      expect(res.body).toHaveProperty('role', 'moderator');
    });

    it('should reject duplicate moderator email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/moderators')
        .set('Cookie', ownerCookies)
        .send({ email: 'dupmod@test.com', password: 'modpassword123' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/admin/moderators')
        .set('Cookie', ownerCookies)
        .send({ email: 'dupmod@test.com', password: 'modpassword123' })
        .expect(409);
    });

    it('should reject non-owner moderator creating moderator', async () => {
      const modCookies = await loginAdmin(app, 'mod@test.com', 'modpassword123');

      await request(app.getHttpServer())
        .post('/api/v1/admin/moderators')
        .set('Cookie', modCookies)
        .send({ email: 'anothermod@test.com', password: 'modpassword123' })
        .expect(403);
    });
  });

  describe('DELETE /admin/moderators/:email', () => {
    it('should delete a moderator (owner only)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/moderators')
        .set('Cookie', ownerCookies)
        .send({ email: 'todelete@test.com', password: 'modpassword123' })
        .expect(201);

      await request(app.getHttpServer())
        .delete('/api/v1/admin/moderators/todelete@test.com')
        .set('Cookie', ownerCookies)
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: 'todelete@test.com', password: 'modpassword123' })
        .expect(401);
    });

    it('should return 404 for non-existent moderator', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin/moderators/nonexistent@test.com')
        .set('Cookie', ownerCookies)
        .expect(404);
    });

    it('should reject non-owner moderator deleting moderator', async () => {
      const modCookies = await loginAdmin(app, 'newmod@test.com', 'modpassword123');

      await request(app.getHttpServer())
        .delete('/api/v1/admin/moderators/mod@test.com')
        .set('Cookie', modCookies)
        .expect(403);
    });
  });
});
