import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp, mockEmailProvider, mockStorageProvider } from './setup/test-app';
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
    it('should register a new user and set cookie', async () => {
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
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('user_access_token');
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
      const res = await request(app.getHttpServer()).post('/api/v1/users/auth/logout').expect(200);

      expect(res.body).toEqual({ message: 'Logout successful' });
      expect(res.headers['set-cookie'][0]).toContain('user_access_token=;');
    });
  });

  describe('POST /users/auth/forgot-password', () => {
    beforeEach(() => {
      mockEmailProvider.sentEmails = [];
    });

    it('should send OTP for existing user', async () => {
      const email = 'forgotpassword1@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Forgot',
          lastName: 'Password',
          interestIds: interestIds.slice(0, 1),
        });

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(res.body).toEqual({ message: 'If an account exists, an OTP has been sent' });
      expect(mockEmailProvider.sentEmails).toHaveLength(1);
      expect(mockEmailProvider.sentEmails[0].to).toBe(email);
    });

    it('should return 404 for non-existing user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(404);
    });

    it('should throttle rapid OTP requests', async () => {
      const email = 'forgotpassword2@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Throttle',
          lastName: 'User',
          interestIds: interestIds.slice(0, 1),
        });

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email })
        .expect(429);
    });
  });

  describe('POST /users/auth/reset-password', () => {
    beforeEach(() => {
      mockEmailProvider.sentEmails = [];
    });

    it('should reset password with valid OTP', async () => {
      const email = 'resetpassword1@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email,
          password: 'oldpassword123',
          firstName: 'Reset',
          lastName: 'Password',
          interestIds: interestIds.slice(0, 1),
        });

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email })
        .expect(200);

      const emailHtml = mockEmailProvider.sentEmails[0].html;
      const codeMatch = emailHtml.match(/letter-spacing: 12px[^>]*>\s*(\d{4})\s*</);
      const otpCode = codeMatch ? codeMatch[1] : '';

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/auth/reset-password')
        .send({ email, code: otpCode, newPassword: 'newpassword123' })
        .expect(200);

      expect(res.body).toEqual({ message: 'Password reset successful' });

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/login')
        .send({ email, password: 'newpassword123' })
        .expect(200);
    });

    it('should reject invalid OTP code', async () => {
      const email = 'resetpassword2@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Invalid',
          lastName: 'Otp',
          interestIds: interestIds.slice(0, 1),
        });

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/reset-password')
        .send({ email, code: '0000', newPassword: 'newpassword123' })
        .expect(400);
    });

    it('should reject expired or non-existent OTP', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/reset-password')
        .send({ email: 'nonotp@test.com', code: '1234', newPassword: 'newpassword123' })
        .expect(400);
    });

    it('should throttle after too many failed attempts', async () => {
      const email = 'resetthrottle@test.com';
      await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Throttle',
          lastName: 'Test',
          interestIds: interestIds.slice(0, 1),
        });

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/forgot-password')
        .send({ email })
        .expect(200);

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/users/auth/reset-password')
          .send({ email, code: '0000', newPassword: 'newpassword123' });
      }

      await request(app.getHttpServer())
        .post('/api/v1/users/auth/reset-password')
        .send({ email, code: '0000', newPassword: 'newpassword123' })
        .expect(429);
    });
  });

  describe('Avatar upload during registration flow', () => {
    it('should allow pending user to upload avatar and update profile', async () => {
      const email = 'avatar-registration@test.com';

      const registerRes = await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email,
          password: 'password123',
          firstName: 'Avatar',
          lastName: 'Test',
          interestIds: interestIds.slice(0, 2),
        })
        .expect(201);

      const userId = registerRes.body.userId;
      const cookies = registerRes.headers['set-cookie'] as unknown as string[];

      expect(userId).toBeDefined();
      expect(cookies).toBeDefined();

      const userBeforeAvatar = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(userBeforeAvatar.body.status).toBe('pending');
      expect(userBeforeAvatar.body.avatarUrl).toBeNull();

      const imageBuffer = createTestImageBuffer();
      const initialUploadCount = mockStorageProvider.uploadedFiles.length;

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', cookies)
        .field('entity', 'users')
        .field('entityId', userId)
        .field('field', 'avatar')
        .attach('file', imageBuffer, 'avatar.jpg')
        .expect(201);

      expect(uploadRes.body).toHaveProperty('path');
      expect(uploadRes.body.path).toContain('users');
      expect(uploadRes.body.path).toContain(userId);
      expect(uploadRes.body.path).toContain('avatar');
      expect(mockStorageProvider.uploadedFiles.length).toBe(initialUploadCount + 1);

      const avatarPath = uploadRes.body.path;

      const updateRes = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', cookies)
        .send({ avatarUrl: avatarPath })
        .expect(200);

      expect(updateRes.body.avatarUrl).toBe(avatarPath);
      expect(updateRes.body.status).toBe('pending');

      const userAfterAvatar = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(userAfterAvatar.body.avatarUrl).toBe(avatarPath);
    });

    it('should reject avatar upload for different user during registration', async () => {
      const email1 = 'avatar-user1@test.com';
      const email2 = 'avatar-user2@test.com';

      const registerRes1 = await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: email1,
          password: 'password123',
          firstName: 'User',
          lastName: 'One',
          interestIds: interestIds.slice(0, 1),
        })
        .expect(201);

      const registerRes2 = await request(app.getHttpServer())
        .post('/api/v1/users/auth/register')
        .send({
          email: email2,
          password: 'password123',
          firstName: 'User',
          lastName: 'Two',
          interestIds: interestIds.slice(0, 1),
        })
        .expect(201);

      const user1Cookies = registerRes1.headers['set-cookie'] as unknown as string[];
      const user2Id = registerRes2.body.userId;

      const imageBuffer = createTestImageBuffer();

      const uploadRes = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', user1Cookies)
        .field('entity', 'users')
        .field('entityId', user2Id)
        .field('field', 'avatar')
        .attach('file', imageBuffer, 'avatar.jpg')
        .expect(403);

      expect(uploadRes.body.code).toBe('FORBIDDEN_ENTITY_ACCESS');
    });
  });
});

function createTestImageBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}
