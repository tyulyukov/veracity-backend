import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { getInterestIds } from './setup/auth.helper';

describe('User Auth (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /users/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          interestIds: interestIds.slice(0, 2),
        })
        .expect(201);

      expect(res.body).toHaveProperty('userId');
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password123',
          firstName: 'Dup',
          lastName: 'User',
          interestIds: interestIds.slice(0, 1),
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: 'duplicate@test.com',
          password: 'password123',
          firstName: 'Dup2',
          lastName: 'User2',
          interestIds: interestIds.slice(0, 1),
        })
        .expect(409);
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Bad',
          lastName: 'Email',
          interestIds: interestIds.slice(0, 1),
        })
        .expect(400);
    });
  });

  describe('POST /users/auth/login', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: 'loginuser@test.com',
          password: 'password123',
          firstName: 'Login',
          lastName: 'User',
          interestIds: interestIds.slice(0, 1),
        });
    });

    it('should login and set cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'loginuser@test.com', password: 'password123' })
        .expect(200);

      expect(res.body).toEqual({ message: 'Login successful' });
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('user_access_token');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'loginuser@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('POST /users/auth/logout', () => {
    it('should clear cookie on logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/auth/logout')
        .expect(200);

      expect(res.body).toEqual({ message: 'Logout successful' });
      expect(res.headers['set-cookie'][0]).toContain('user_access_token=;');
    });
  });
});

