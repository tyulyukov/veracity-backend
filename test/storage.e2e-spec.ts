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

  describe('POST /storage/upload', () => {
    it('should upload avatar image for authenticated user', async () => {
      const initialCount = mockStorageProvider.uploadedFiles.length;
      const imageBuffer = createTestImageBuffer();

      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', userCookies)
        .field('entity', 'users')
        .field('entityId', userId)
        .field('field', 'avatar')
        .attach('file', imageBuffer, 'test.jpg')
        .expect(201);

      expect(res.body).toHaveProperty('path');
      expect(res.body.path).toContain('local/users');
      expect(res.body.path).toContain(userId);
      expect(res.body.path).toContain('avatar');
      expect(res.body.path).toMatch(/\.jpeg$/);

      expect(mockStorageProvider.uploadedFiles.length).toBe(initialCount + 1);
      const uploaded = mockStorageProvider.uploadedFiles[mockStorageProvider.uploadedFiles.length - 1];
      expect(uploaded.entity).toBe('users');
      expect(uploaded.entityId).toBe(userId);
      expect(uploaded.field).toBe('avatar');
      expect(uploaded.contentType).toBe('image/jpeg');
      expect(uploaded.size).toBeLessThanOrEqual(1_000_000);
    });

    it('should reject unauthenticated request', async () => {
      const imageBuffer = createTestImageBuffer();

      await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .field('entity', 'users')
        .field('entityId', userId)
        .field('field', 'avatar')
        .attach('file', imageBuffer, 'test.jpg')
        .expect(401);
    });

    it('should reject upload for different user', async () => {
      const otherUserId = '550e8400-e29b-41d4-a716-446655440000';
      const imageBuffer = createTestImageBuffer();

      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', userCookies)
        .field('entity', 'users')
        .field('entityId', otherUserId)
        .field('field', 'avatar')
        .attach('file', imageBuffer, 'test.jpg')
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN_ENTITY_ACCESS');
    });

    it('should reject non-image file (PDF)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%test pdf');

      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', userCookies)
        .field('entity', 'users')
        .field('entityId', userId)
        .field('field', 'avatar')
        .attach('file', pdfBuffer, { filename: 'document.pdf', contentType: 'application/pdf' })
        .expect(400);

      expect(res.body.code).toBe('INVALID_FILE_MIME_TYPE');
    });

    it('should reject non-image file (text)', async () => {
      const textBuffer = Buffer.from('Hello World');

      const res = await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', userCookies)
        .field('entity', 'users')
        .field('entityId', userId)
        .field('field', 'avatar')
        .attach('file', textBuffer, { filename: 'file.txt', contentType: 'text/plain' })
        .expect(400);

      expect(res.body.code).toBe('INVALID_FILE_MIME_TYPE');
    });

    it('should reject invalid entity', async () => {
      const imageBuffer = createTestImageBuffer();

      await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', userCookies)
        .field('entity', 'invalid')
        .field('entityId', userId)
        .field('field', 'avatar')
        .attach('file', imageBuffer, 'test.jpg')
        .expect(400);
    });

    it('should reject invalid field', async () => {
      const imageBuffer = createTestImageBuffer();

      await request(app.getHttpServer())
        .post('/api/v1/storage/upload')
        .set('Cookie', userCookies)
        .field('entity', 'users')
        .field('entityId', userId)
        .field('field', 'invalid')
        .attach('file', imageBuffer, 'test.jpg')
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

function createTestImageBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
}
