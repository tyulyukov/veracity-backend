import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /healthz', () => {
    it('should return ok', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/healthz').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /readyz', () => {
    it('should return health check status', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/readyz').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
