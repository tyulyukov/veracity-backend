import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp, mockStorageProvider } from './setup/test-app';
import { registerUser, loginUser, getInterestIds } from './setup/auth.helper';

describe('Storage (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];
  let userCookies: string[];
  let userId: string;

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);

    await registerUser(app, {
      email: 'storage-user@test.com',
      password: 'password123',
      firstName: 'Storage',
      lastName: 'User',
      interestIds: interestIds.slice(0, 2),
    });

    userCookies = await loginUser(app, 'storage-user@test.com', 'password123');
    userId = await getUserId(app, userCookies);
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /storage/upload-url', () => {
    it('should generate presigned upload URL for own avatar', async () => {
      const initialCount = mockStorageProvider.uploadRequests.length;

      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .set('Cookie', userCookies)
        .send({
          entity: 'users',
          entityId: userId,
          field: 'avatar',
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('publicUrl');
      expect(res.body.uploadUrl).toContain('X-Amz-Signature');
      expect(res.body.publicUrl).toContain('storage.test.com');
      expect(res.body.publicUrl).toContain(userId);
      expect(res.body.publicUrl).toContain('avatar');
      expect(res.body.publicUrl).toContain('profile.jpg');

      expect(mockStorageProvider.uploadRequests.length).toBe(initialCount + 1);
      const lastRequest = mockStorageProvider.uploadRequests[mockStorageProvider.uploadRequests.length - 1];
      expect(lastRequest).toEqual({
        entity: 'users',
        entityId: userId,
        field: 'avatar',
        filename: 'profile.jpg',
        contentType: 'image/jpeg',
      });
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .send({
          entity: 'users',
          entityId: userId,
          field: 'avatar',
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
        })
        .expect(401);
    });

    it('should reject upload for different user', async () => {
      const otherUserId = '550e8400-e29b-41d4-a716-446655440000';

      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .set('Cookie', userCookies)
        .send({
          entity: 'users',
          entityId: otherUserId,
          field: 'avatar',
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN_ENTITY_ACCESS');
    });

    it('should reject invalid content type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .set('Cookie', userCookies)
        .send({
          entity: 'users',
          entityId: userId,
          field: 'avatar',
          filename: 'profile.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
    });

    it('should reject invalid entity', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .set('Cookie', userCookies)
        .send({
          entity: 'invalid',
          entityId: userId,
          field: 'avatar',
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('should reject invalid field', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .set('Cookie', userCookies)
        .send({
          entity: 'users',
          entityId: userId,
          field: 'invalid',
          filename: 'profile.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('should reject filename with invalid characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/storage/upload-url')
        .set('Cookie', userCookies)
        .send({
          entity: 'users',
          entityId: userId,
          field: 'avatar',
          filename: '../../../etc/passwd',
          contentType: 'image/jpeg',
        })
        .expect(400);
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
