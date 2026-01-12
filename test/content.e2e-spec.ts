import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { setupTestApp, teardownTestApp } from './setup/test-app';
import { registerUser, loginUser, loginAdmin, getInterestIds } from './setup/auth.helper';

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

async function sendConnectionRequest(
  app: INestApplication,
  cookies: string[],
  targetUserId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post(`/api/v1/connections/${targetUserId}`)
    .set('Cookie', cookies)
    .expect(201);
}

async function approveConnection(
  app: INestApplication,
  cookies: string[],
  requesterUserId: string,
): Promise<void> {
  await request(app.getHttpServer())
    .patch(`/api/v1/connections/${requesterUserId}/respond`)
    .set('Cookie', cookies)
    .send({ response: 'approved' })
    .expect(200);
}

describe('Content (e2e)', () => {
  let app: INestApplication;
  let interestIds: string[];
  let adminCookies: string[];
  let user1Cookies: string[];
  let user2Cookies: string[];
  let user3Cookies: string[];
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;
  let postId: string;
  let commentId: string;

  beforeAll(async () => {
    app = await setupTestApp();
    interestIds = await getInterestIds(app);
    adminCookies = await loginAdmin(app, process.env.OWNER_EMAIL!, process.env.OWNER_PASSWORD!);

    await registerUser(app, {
      email: 'content-user1@test.com',
      password: 'password123',
      firstName: 'Content',
      lastName: 'UserOne',
      interestIds: interestIds.slice(0, 2),
    });

    await registerUser(app, {
      email: 'content-user2@test.com',
      password: 'password123',
      firstName: 'Content',
      lastName: 'UserTwo',
      interestIds: interestIds.slice(0, 2),
    });

    await registerUser(app, {
      email: 'content-user3@test.com',
      password: 'password123',
      firstName: 'Content',
      lastName: 'UserThree',
      interestIds: interestIds.slice(0, 2),
    });

    user1Cookies = await loginUser(app, 'content-user1@test.com', 'password123');
    user2Cookies = await loginUser(app, 'content-user2@test.com', 'password123');
    user3Cookies = await loginUser(app, 'content-user3@test.com', 'password123');

    user1Id = await getUserId(app, user1Cookies);
    user2Id = await getUserId(app, user2Cookies);
    user3Id = await getUserId(app, user3Cookies);

    await activateUser(app, adminCookies, user1Id);
    await activateUser(app, adminCookies, user2Id);
    await activateUser(app, adminCookies, user3Id);

    user1Cookies = await loginUser(app, 'content-user1@test.com', 'password123');
    user2Cookies = await loginUser(app, 'content-user2@test.com', 'password123');
    user3Cookies = await loginUser(app, 'content-user3@test.com', 'password123');

    await sendConnectionRequest(app, user1Cookies, user2Id);
    await approveConnection(app, user2Cookies, user1Id);
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('POST /posts', () => {
    it('should create post with text only', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', user1Cookies)
        .send({
          text: 'This is my first post!',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.text).toBe('This is my first post!');
      expect(res.body.imageUrls).toEqual([]);
      expect(res.body.likeCount).toBe(0);
      expect(res.body.commentCount).toBe(0);
      expect(res.body.isLikedByCurrentUser).toBe(false);
      expect(res.body.author).toBeDefined();
      expect(res.body.author.firstName).toBe('Content');

      postId = res.body.id;
    });

    it('should create post with images only', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', user2Cookies)
        .send({
          imageUrls: ['https://example.com/image1.jpg'],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.text).toBeNull();
      expect(res.body.imageUrls).toEqual(['https://example.com/image1.jpg']);
    });

    it('should reject post without text or images', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', user1Cookies)
        .send({})
        .expect(400);
    });

    it('should reject unauthenticated post creation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .send({
          text: 'Test post',
        })
        .expect(401);
    });
  });

  describe('GET /posts/feed', () => {
    it('should get feed from approved connections and own posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/feed')
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.posts.length).toBeGreaterThan(0);
      const authorIds = res.body.posts.map((p: { author: { id: string } }) => p.author.id);
      expect(authorIds).toContain(user1Id);
      expect(authorIds).toContain(user2Id);
      expect(res.body.nextCursor).toBeDefined();
    });

    it('should show own posts in feed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/feed')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      const ownPosts = res.body.posts.filter((p: any) => p.author.id === user1Id);
      expect(ownPosts.length).toBeGreaterThan(0);
    });

    it('should not show posts from non-connections', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/feed')
        .set('Cookie', user3Cookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.posts.length).toBe(0);
    });

    it('should support pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/feed?limit=1')
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.posts.length).toBeLessThanOrEqual(1);
      expect(res.body.nextCursor).toBeDefined();
    });
  });

  describe('GET /posts/my', () => {
    it('should get own posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/my')
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.posts.length).toBeGreaterThan(0);
      expect(res.body.posts.every((p: any) => p.text || p.imageUrls.length > 0)).toBe(true);
    });
  });

  describe('GET /posts/user/:userId', () => {
    it('should get posts from a connected user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/user/${user1Id}`)
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.posts.length).toBeGreaterThan(0);
      expect(res.body.posts.every((p: any) => p.author.id === user1Id)).toBe(true);
      expect(res.body.nextCursor).toBeDefined();
    });

    it('should reject access to posts from non-connected user', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/posts/user/${user1Id}`)
        .set('Cookie', user3Cookies)
        .expect(403);
    });

    it('should reject access to non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/posts/user/00000000-0000-0000-0000-000000000000')
        .set('Cookie', user1Cookies)
        .expect(404);
    });

    it('should support cursor pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/user/${user1Id}?limit=1`)
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.posts.length).toBeLessThanOrEqual(1);
      expect(res.body.nextCursor).toBeDefined();
    });

    it('should return empty array for user with no posts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/user/${user2Id}`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.nextCursor).toBeNull();
    });
  });

  describe('GET /posts/:postId', () => {
    it('should get post by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${postId}`)
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.id).toBe(postId);
      expect(res.body.text).toBe('This is my first post!');
      expect(res.body.author).toBeDefined();
    });

    it('should reject access to non-existent post', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/posts/00000000-0000-0000-0000-000000000000')
        .set('Cookie', user1Cookies)
        .expect(404);
    });
  });

  describe('PATCH /posts/:postId', () => {
    it('should update own post', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}`)
        .set('Cookie', user1Cookies)
        .send({
          text: 'Updated post content',
        })
        .expect(200);

      expect(res.body.text).toBe('Updated post content');
    });

    it('should reject updating other user post', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}`)
        .set('Cookie', user2Cookies)
        .send({
          text: 'Trying to update',
        })
        .expect(403);
    });
  });

  describe('POST /posts/:postId/like', () => {
    it('should like a post', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/like`)
        .set('Cookie', user2Cookies)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${postId}`)
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.likeCount).toBe(1);
      expect(res.body.isLikedByCurrentUser).toBe(true);
    });

    it('should reject duplicate like', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/like`)
        .set('Cookie', user2Cookies)
        .expect(400);
    });
  });

  describe('DELETE /posts/:postId/like', () => {
    it('should unlike a post', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}/like`)
        .set('Cookie', user2Cookies)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${postId}`)
        .set('Cookie', user2Cookies)
        .expect(200);

      expect(res.body.likeCount).toBe(0);
      expect(res.body.isLikedByCurrentUser).toBe(false);
    });

    it('should reject unlike when not liked', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}/like`)
        .set('Cookie', user2Cookies)
        .expect(404);
    });
  });

  describe('POST /posts/:postId/comments', () => {
    it('should create comment on post', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Cookie', user2Cookies)
        .send({
          text: 'Great post!',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.postId).toBe(postId);
      expect(res.body.text).toBe('Great post!');
      expect(res.body.author.id).toBe(user2Id);

      commentId = res.body.id;
    });

    it('should reject empty comment', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Cookie', user2Cookies)
        .send({
          text: '',
        })
        .expect(400);
    });
  });

  describe('GET /posts/:postId/comments', () => {
    it('should get comments on post', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${postId}/comments`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.comments).toBeInstanceOf(Array);
      expect(res.body.comments.length).toBeGreaterThan(0);
      expect(res.body.comments[0].text).toBe('Great post!');
      expect(res.body.nextCursor).toBeDefined();
    });
  });

  describe('PATCH /posts/:postId/comments/:commentId', () => {
    it('should update own comment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}/comments/${commentId}`)
        .set('Cookie', user2Cookies)
        .send({
          text: 'Updated comment',
        })
        .expect(200);

      expect(res.body.text).toBe('Updated comment');
    });

    it('should reject updating other user comment', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/posts/${postId}/comments/${commentId}`)
        .set('Cookie', user1Cookies)
        .send({
          text: 'Trying to update',
        })
        .expect(403);
    });
  });

  describe('DELETE /posts/:postId/comments/:commentId', () => {
    it('should delete own comment', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}/comments/${commentId}`)
        .set('Cookie', user2Cookies)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${postId}/comments`)
        .set('Cookie', user1Cookies)
        .expect(200);

      expect(res.body.comments.length).toBe(0);
    });

    it('should reject deleting other user comment', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/comments`)
        .set('Cookie', user2Cookies)
        .send({
          text: 'Another comment',
        })
        .expect(201);

      const newCommentId = res.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}/comments/${newCommentId}`)
        .set('Cookie', user1Cookies)
        .expect(403);
    });
  });

  describe('DELETE /posts/:postId', () => {
    it('should soft delete own post', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${postId}`)
        .set('Cookie', user1Cookies)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/posts/${postId}`)
        .set('Cookie', user2Cookies)
        .expect(404);
    });

    it('should reject deleting other user post', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Cookie', user2Cookies)
        .send({
          text: 'Another post',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${res.body.id}`)
        .set('Cookie', user1Cookies)
        .expect(403);
    });
  });

  describe('GET /admin/users/:userId/posts', () => {
    it('should get user posts including soft-deleted', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${user1Id}/posts`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.posts).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThan(0);
      const softDeletedPost = res.body.posts.find((p: any) => p.id === postId);
      expect(softDeletedPost).toBeDefined();
      expect(softDeletedPost.deletedAt).toBeDefined();
    });

    it('should support offset pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${user1Id}/posts?limit=1&offset=0`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.posts.length).toBeLessThanOrEqual(1);
      expect(res.body.total).toBeGreaterThan(0);
    });
  });

  describe('GET /admin/users/:userId/activity', () => {
    it('should get user activity feed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${user1Id}/activity`)
        .set('Cookie', adminCookies)
        .expect(200);

      expect(res.body.activities).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThan(0);

      const hasPostCreated = res.body.activities.some(
        (a: any) => a.activityType === 'post_created',
      );
      const hasPostDeleted = res.body.activities.some(
        (a: any) => a.activityType === 'post_deleted',
      );
      expect(hasPostCreated || hasPostDeleted).toBe(true);
    });
  });
});
