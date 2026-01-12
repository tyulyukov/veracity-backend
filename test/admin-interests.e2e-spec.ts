import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { loginAdmin } from './setup/auth.helper';

describe('Admin Interests (e2e)', () => {
  let app: INestApplication;
  let adminCookies: string[];

  beforeAll(async () => {
    app = await setupTestApp();
    adminCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /admin/interests', () => {
    it('should return paginated interests list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body).toHaveProperty('interests');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.interests)).toBe(true);
      expect(res.body.total).toBeGreaterThan(0);

      if (res.body.interests.length > 0) {
        expect(res.body.interests[0]).toHaveProperty('id');
        expect(res.body.interests[0]).toHaveProperty('name');
      }
    });

    it('should support offset pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/interests?limit=2&offset=0')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.interests.length).toBeLessThanOrEqual(2);
    });

    it('should support search filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/interests?search=AI')
        .set('Cookie', adminCookies)
        .expect(200);

      expect(
        res.body.interests.every((i: { name: string }) => i.name.toLowerCase().includes('ai')),
      ).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/interests').expect(401);
    });
  });

  describe('POST /admin/interests', () => {
    it('should create a new interest', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: 'Web3' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Web3');
    });

    it('should trim whitespace from interest name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: '  Quantum Computing  ' })
        .expect(201);

      expect(res.body.name).toBe('Quantum Computing');
    });

    it('should reject duplicate interest name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: 'Cybersecurity' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: 'Cybersecurity' })
        .expect(409);
    });

    it('should reject duplicate interest name (case-insensitive)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: 'Machine Learning' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: 'machine learning' })
        .expect(409);
    });

    it('should reject empty name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: '' })
        .expect(400);
    });

    it('should reject name exceeding max length', async () => {
      const longName = 'a'.repeat(256);
      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: longName })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .send({ name: 'NewInterest' })
        .expect(401);
    });
  });

  describe('PATCH /admin/interests/:id', () => {
    let testInterestId: string;

    beforeEach(async () => {
      const uniqueName = `ToUpdate-${Date.now()}-${Math.random()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: uniqueName })
        .expect(201);
      testInterestId = res.body.id;
    });

    it('should update interest name', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/interests/${testInterestId}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Interest' })
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .expect(200);

      const updatedInterest = res.body.interests.find(
        (i: { id: string }) => i.id === testInterestId,
      );
      expect(updatedInterest.name).toBe('Updated Interest');
    });

    it('should trim whitespace when updating', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/interests/${testInterestId}`)
        .set('Cookie', adminCookies)
        .send({ name: '  Trimmed Name  ' })
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .expect(200);

      const updatedInterest = res.body.interests.find(
        (i: { id: string }) => i.id === testInterestId,
      );
      expect(updatedInterest.name).toBe('Trimmed Name');
    });

    it('should reject duplicate name on update', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: 'Existing Interest' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/interests/${testInterestId}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Existing Interest' })
        .expect(409);
    });

    it('should return 404 for non-existent interest', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/interests/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookies)
        .send({ name: 'New Name' })
        .expect(404);
    });

    it('should reject empty name', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/interests/${testInterestId}`)
        .set('Cookie', adminCookies)
        .send({ name: '' })
        .expect(400);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/interests/${testInterestId}`)
        .send({ name: 'NewName' })
        .expect(401);
    });
  });

  describe('DELETE /admin/interests/:id', () => {
    let testInterestId: string;

    beforeEach(async () => {
      const uniqueName = `ToDelete-${Date.now()}-${Math.random()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .send({ name: uniqueName })
        .expect(201);
      testInterestId = res.body.id;
    });

    it('should delete an interest', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/interests/${testInterestId}`)
        .set('Cookie', adminCookies)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/interests')
        .set('Cookie', adminCookies)
        .expect(200);

      const deletedInterest = res.body.interests.find(
        (i: { id: string }) => i.id === testInterestId,
      );
      expect(deletedInterest).toBeUndefined();
    });

    it('should return 404 for non-existent interest', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin/interests/00000000-0000-0000-0000-000000000000')
        .set('Cookie', adminCookies)
        .expect(404);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/interests/${testInterestId}`)
        .expect(401);
    });
  });
});
