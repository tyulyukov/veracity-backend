import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export async function registerUser(
  app: INestApplication,
  data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    interestIds: string[];
  },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/users/auth/register')
    .send(data)
    .expect(201);
  return res.body.userId;
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/users/auth/login')
    .send({ email, password })
    .expect(200);
  return res.headers['set-cookie'] as unknown as string[];
}

export async function loginAdmin(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string[]> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/admin/auth/login')
    .send({ email, password })
    .expect(200);
  return res.headers['set-cookie'] as unknown as string[];
}

export async function getInterestIds(app: INestApplication): Promise<string[]> {
  const res = await request(app.getHttpServer()).get('/api/v1/interests').expect(200);
  return res.body.map((i: { id: string }) => i.id);
}

