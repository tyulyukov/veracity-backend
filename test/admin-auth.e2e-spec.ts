import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';

describe('Admin Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /admin/auth/login', () => {
    it('should login owner and set cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: process.env.OWNER_EMAIL,
          password: process.env.OWNER_PASSWORD,
        })
        .expect(200);

      expect(res.body).toEqual({ message: 'Login successful' });
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('admin_access_token');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: process.env.OWNER_EMAIL,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent admin', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('POST /admin/auth/logout', () => {
    it('should clear cookie on logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/logout')
        .expect(200);

      expect(res.body).toEqual({ message: 'Logout successful' });
      expect(res.headers['set-cookie'][0]).toContain('admin_access_token=;');
    });
  });
});

