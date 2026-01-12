import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Add missing columns to posts table
    ALTER TABLE posts
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN deleted_at TIMESTAMPTZ,
      ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

    -- Add missing columns to comments table
    ALTER TABLE comments
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN deleted_at TIMESTAMPTZ;

    -- Enable RLS on tables
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

    -- Additional indexes for efficient queries
    CREATE INDEX idx_posts_created_at_id ON posts(created_at DESC, id DESC);
    CREATE INDEX idx_posts_not_deleted ON posts(author_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_comments_created_at_id ON comments(created_at DESC, id DESC);
    CREATE INDEX idx_comments_not_deleted ON comments(post_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_connections_approved_lookup ON connections(requester_user_id, target_user_id) WHERE status = 'approved';

    -- Trigger function to update like_count on posts
    CREATE OR REPLACE FUNCTION general.update_post_like_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
      END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger
    CREATE TRIGGER trg_update_post_like_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION general.update_post_like_count();

    -- RLS Policies for posts
    -- Users can see non-deleted posts from approved connections
    CREATE POLICY posts_select_user ON posts FOR SELECT TO standard_user, speaker
      USING (
        deleted_at IS NULL AND EXISTS (
          SELECT 1 FROM connections c
          JOIN users u ON u.email = session_user
          WHERE c.status = 'approved'
            AND ((c.requester_user_id = u.id AND c.target_user_id = posts.author_id)
              OR (c.requester_user_id = posts.author_id AND c.target_user_id = u.id))
        )
      );

    -- Admins can see all posts including soft-deleted
    CREATE POLICY posts_select_admin ON posts FOR SELECT TO moderator, owner USING (true);

    GRANT SELECT ON posts TO standard_user, speaker, moderator, owner;

    -- RLS Policies for post_likes
    CREATE POLICY post_likes_select_user ON post_likes FOR SELECT TO standard_user, speaker
      USING (EXISTS (SELECT 1 FROM posts WHERE id = post_id));

    CREATE POLICY post_likes_select_admin ON post_likes FOR SELECT TO moderator, owner USING (true);

    GRANT SELECT ON post_likes TO standard_user, speaker, moderator, owner;

    -- RLS Policies for comments
    CREATE POLICY comments_select_user ON comments FOR SELECT TO standard_user, speaker
      USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM posts WHERE id = post_id));

    CREATE POLICY comments_select_admin ON comments FOR SELECT TO moderator, owner USING (true);

    GRANT SELECT ON comments TO standard_user, speaker, moderator, owner;

    -- User view: Feed of posts from approved connections (not own posts)
    CREATE VIEW "user".posts_feed_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    ),
    connected_users AS (
      SELECT
        CASE WHEN c.requester_user_id = cu.id THEN c.target_user_id ELSE c.requester_user_id END AS user_id
      FROM connections c
      CROSS JOIN current_user_id cu
      WHERE c.status = 'approved'
        AND (c.requester_user_id = cu.id OR c.target_user_id = cu.id)
    ),
    post_comment_counts AS (
      SELECT post_id, COUNT(*)::int AS comment_count
      FROM comments
      WHERE deleted_at IS NULL
      GROUP BY post_id
    )
    SELECT
      p.id,
      p.text,
      p.image_urls,
      p.like_count,
      COALESCE(pcc.comment_count, 0) AS comment_count,
      p.created_at,
      p.updated_at,
      author.id AS author_id,
      author.first_name AS author_first_name,
      author.last_name AS author_last_name,
      author.avatar_url AS author_avatar_url,
      author.role AS author_role,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = cu.id
      ) AS is_liked_by_current_user
    FROM posts p
    CROSS JOIN current_user_id cu
    JOIN connected_users conn ON p.author_id = conn.user_id
    JOIN users author ON p.author_id = author.id
    LEFT JOIN post_comment_counts pcc ON p.id = pcc.post_id
    WHERE p.deleted_at IS NULL
      AND author.status = 'active'
      AND p.author_id != cu.id;

    GRANT SELECT ON "user".posts_feed_v TO standard_user, speaker;

    -- User view: Single post with details
    CREATE VIEW "user".post_with_details_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    ),
    post_comment_counts AS (
      SELECT post_id, COUNT(*)::int AS comment_count
      FROM comments
      WHERE deleted_at IS NULL
      GROUP BY post_id
    )
    SELECT
      p.id,
      p.text,
      p.image_urls,
      p.like_count,
      COALESCE(pcc.comment_count, 0) AS comment_count,
      p.created_at,
      p.updated_at,
      author.id AS author_id,
      author.first_name AS author_first_name,
      author.last_name AS author_last_name,
      author.avatar_url AS author_avatar_url,
      author.role AS author_role,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = cu.id
      ) AS is_liked_by_current_user
    FROM posts p
    CROSS JOIN current_user_id cu
    JOIN users author ON p.author_id = author.id
    LEFT JOIN post_comment_counts pcc ON p.id = pcc.post_id
    WHERE p.deleted_at IS NULL
      AND author.status = 'active';

    GRANT SELECT ON "user".post_with_details_v TO standard_user, speaker;

    -- User view: User's own posts
    CREATE VIEW "user".my_posts_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    ),
    post_comment_counts AS (
      SELECT post_id, COUNT(*)::int AS comment_count
      FROM comments
      WHERE deleted_at IS NULL
      GROUP BY post_id
    )
    SELECT
      p.id,
      p.text,
      p.image_urls,
      p.like_count,
      COALESCE(pcc.comment_count, 0) AS comment_count,
      p.created_at,
      p.updated_at,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = cu.id
      ) AS is_liked_by_current_user
    FROM posts p
    CROSS JOIN current_user_id cu
    LEFT JOIN post_comment_counts pcc ON p.id = pcc.post_id
    WHERE p.author_id = cu.id
      AND p.deleted_at IS NULL;

    GRANT SELECT ON "user".my_posts_v TO standard_user, speaker;

    -- User view: Comments with author info
    CREATE VIEW "user".post_comments_v AS
    SELECT
      c.id,
      c.post_id,
      c.text,
      c.created_at,
      c.updated_at,
      author.id AS author_id,
      author.first_name AS author_first_name,
      author.last_name AS author_last_name,
      author.avatar_url AS author_avatar_url,
      author.role AS author_role
    FROM comments c
    JOIN users author ON c.user_id = author.id
    WHERE c.deleted_at IS NULL
      AND author.status = 'active';

    GRANT SELECT ON "user".post_comments_v TO standard_user, speaker;

    -- Admin view: All posts including soft-deleted
    CREATE VIEW admin.posts_v AS
    WITH post_comment_counts AS (
      SELECT post_id, COUNT(*)::int AS comment_count
      FROM comments
      GROUP BY post_id
    )
    SELECT
      p.id,
      p.text,
      p.image_urls,
      p.like_count,
      COALESCE(pcc.comment_count, 0) AS comment_count,
      p.created_at,
      p.updated_at,
      p.deleted_at,
      author.id AS author_id,
      author.email AS author_email,
      author.first_name AS author_first_name,
      author.last_name AS author_last_name,
      author.avatar_url AS author_avatar_url,
      author.role AS author_role
    FROM posts p
    JOIN users author ON p.author_id = author.id
    LEFT JOIN post_comment_counts pcc ON p.id = pcc.post_id;

    GRANT SELECT ON admin.posts_v TO moderator, owner;

    -- Admin view: All comments including soft-deleted
    CREATE VIEW admin.comments_v AS
    SELECT
      c.id,
      c.post_id,
      c.text,
      c.created_at,
      c.updated_at,
      c.deleted_at,
      author.id AS author_id,
      author.email AS author_email,
      author.first_name AS author_first_name,
      author.last_name AS author_last_name,
      author.avatar_url AS author_avatar_url,
      author.role AS author_role
    FROM comments c
    JOIN users author ON c.user_id = author.id;

    GRANT SELECT ON admin.comments_v TO moderator, owner;

    -- Admin view: User activity feed (derived from existing data)
    CREATE VIEW admin.user_activity_v AS
    SELECT
      user_id,
      activity_type,
      entity_id,
      entity_type,
      content_preview,
      activity_at
    FROM (
      SELECT
        author_id AS user_id,
        'post_created' AS activity_type,
        id AS entity_id,
        'post' AS entity_type,
        LEFT(text, 100) AS content_preview,
        created_at AS activity_at
      FROM posts
      WHERE deleted_at IS NULL

      UNION ALL

      SELECT
        author_id AS user_id,
        'post_deleted' AS activity_type,
        id AS entity_id,
        'post' AS entity_type,
        LEFT(text, 100) AS content_preview,
        deleted_at AS activity_at
      FROM posts
      WHERE deleted_at IS NOT NULL

      UNION ALL

      SELECT
        user_id,
        'liked' AS activity_type,
        post_id AS entity_id,
        'post' AS entity_type,
        NULL AS content_preview,
        created_at AS activity_at
      FROM post_likes

      UNION ALL

      SELECT
        user_id,
        'commented' AS activity_type,
        id AS entity_id,
        'comment' AS entity_type,
        LEFT(text, 100) AS content_preview,
        created_at AS activity_at
      FROM comments
      WHERE deleted_at IS NULL
    ) AS activities;

    GRANT SELECT ON admin.user_activity_v TO moderator, owner;

    -- Function: Create post
    CREATE OR REPLACE FUNCTION "user".fn_create_post(
      p_text TEXT,
      p_image_urls TEXT[]
    )
    RETURNS TABLE (
      id UUID,
      author_id UUID,
      text TEXT,
      image_urls TEXT[],
      like_count INTEGER,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      IF (p_text IS NULL OR TRIM(p_text) = '') AND (p_image_urls IS NULL OR array_length(p_image_urls, 1) IS NULL) THEN
        RAISE EXCEPTION 'Post must have text or images';
      END IF;

      INSERT INTO posts (author_id, text, image_urls, like_count, created_at, updated_at)
      VALUES (v_user_id, p_text, COALESCE(p_image_urls, '{}'), 0, NOW(), NOW())
      RETURNING posts.id, posts.author_id, posts.text, posts.image_urls, posts.like_count, posts.created_at, posts.updated_at
      INTO id, author_id, text, image_urls, like_count, created_at, updated_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_create_post(TEXT, TEXT[]) TO standard_user, speaker;

    -- Function: Update post
    CREATE OR REPLACE FUNCTION "user".fn_update_post(
      p_post_id UUID,
      p_text TEXT,
      p_image_urls TEXT[]
    )
    RETURNS TABLE (
      id UUID,
      author_id UUID,
      text TEXT,
      image_urls TEXT[],
      like_count INTEGER,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_post_author_id UUID;
      v_post_deleted_at TIMESTAMPTZ;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT p.author_id, p.deleted_at INTO v_post_author_id, v_post_deleted_at
      FROM posts p WHERE p.id = p_post_id FOR UPDATE;

      IF v_post_author_id IS NULL THEN
        RAISE EXCEPTION 'Post not found';
      END IF;

      IF v_post_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Post has been deleted';
      END IF;

      IF v_post_author_id != v_user_id THEN
        RAISE EXCEPTION 'You can only update your own posts';
      END IF;

      IF (p_text IS NULL OR TRIM(p_text) = '') AND (p_image_urls IS NULL OR array_length(p_image_urls, 1) IS NULL) THEN
        RAISE EXCEPTION 'Post must have text or images';
      END IF;

      UPDATE posts SET
        text = p_text,
        image_urls = COALESCE(p_image_urls, '{}'),
        updated_at = NOW()
      WHERE posts.id = p_post_id
      RETURNING posts.id, posts.author_id, posts.text, posts.image_urls, posts.like_count, posts.created_at, posts.updated_at
      INTO id, author_id, text, image_urls, like_count, created_at, updated_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_update_post(UUID, TEXT, TEXT[]) TO standard_user, speaker;

    -- Function: Soft delete post
    CREATE OR REPLACE FUNCTION "user".fn_soft_delete_post(p_post_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_post_author_id UUID;
      v_post_deleted_at TIMESTAMPTZ;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT author_id, deleted_at INTO v_post_author_id, v_post_deleted_at
      FROM posts WHERE id = p_post_id FOR UPDATE;

      IF v_post_author_id IS NULL THEN
        RAISE EXCEPTION 'Post not found';
      END IF;

      IF v_post_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Post already deleted';
      END IF;

      IF v_post_author_id != v_user_id THEN
        RAISE EXCEPTION 'You can only delete your own posts';
      END IF;

      UPDATE posts SET deleted_at = NOW() WHERE id = p_post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_soft_delete_post(UUID) TO standard_user, speaker;

    -- Function: Like post
    CREATE OR REPLACE FUNCTION "user".fn_like_post(p_post_id UUID)
    RETURNS TABLE (
      post_id UUID,
      user_id UUID,
      created_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_post_exists BOOLEAN;
      v_post_deleted_at TIMESTAMPTZ;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT p.deleted_at
      INTO v_post_deleted_at
      FROM posts p WHERE p.id = p_post_id;

      IF v_post_deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM posts WHERE posts.id = p_post_id) THEN
        RAISE EXCEPTION 'Post not found';
      END IF;

      IF v_post_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Post has been deleted';
      END IF;

      v_post_exists := TRUE;

      IF EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p_post_id AND pl.user_id = v_user_id) THEN
        RAISE EXCEPTION 'Already liked this post';
      END IF;

      INSERT INTO post_likes (post_id, user_id, created_at)
      VALUES (p_post_id, v_user_id, NOW())
      RETURNING post_likes.post_id, post_likes.user_id, post_likes.created_at
      INTO post_id, user_id, created_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_like_post(UUID) TO standard_user, speaker;

    -- Function: Unlike post
    CREATE OR REPLACE FUNCTION "user".fn_unlike_post(p_post_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM post_likes pl WHERE pl.post_id = p_post_id AND pl.user_id = v_user_id) THEN
        RAISE EXCEPTION 'Like not found';
      END IF;

      DELETE FROM post_likes WHERE post_id = p_post_id AND user_id = v_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_unlike_post(UUID) TO standard_user, speaker;

    -- Function: Create comment
    CREATE OR REPLACE FUNCTION "user".fn_create_comment(
      p_post_id UUID,
      p_text TEXT
    )
    RETURNS TABLE (
      id UUID,
      post_id UUID,
      user_id UUID,
      text TEXT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_post_exists BOOLEAN;
      v_post_deleted_at TIMESTAMPTZ;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT p.deleted_at
      INTO v_post_deleted_at
      FROM posts p WHERE p.id = p_post_id;

      IF v_post_deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM posts WHERE posts.id = p_post_id) THEN
        RAISE EXCEPTION 'Post not found';
      END IF;

      IF v_post_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Post has been deleted';
      END IF;

      v_post_exists := TRUE;

      IF p_text IS NULL OR TRIM(p_text) = '' THEN
        RAISE EXCEPTION 'Comment text is required';
      END IF;

      INSERT INTO comments (post_id, user_id, text, created_at, updated_at)
      VALUES (p_post_id, v_user_id, p_text, NOW(), NOW())
      RETURNING comments.id, comments.post_id, comments.user_id, comments.text, comments.created_at, comments.updated_at
      INTO id, post_id, user_id, text, created_at, updated_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_create_comment(UUID, TEXT) TO standard_user, speaker;

    -- Function: Update comment
    CREATE OR REPLACE FUNCTION "user".fn_update_comment(
      p_comment_id UUID,
      p_text TEXT
    )
    RETURNS TABLE (
      id UUID,
      post_id UUID,
      user_id UUID,
      text TEXT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_comment_user_id UUID;
      v_comment_deleted_at TIMESTAMPTZ;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT c.user_id, c.deleted_at INTO v_comment_user_id, v_comment_deleted_at
      FROM comments c WHERE c.id = p_comment_id FOR UPDATE;

      IF v_comment_user_id IS NULL THEN
        RAISE EXCEPTION 'Comment not found';
      END IF;

      IF v_comment_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Comment has been deleted';
      END IF;

      IF v_comment_user_id != v_user_id THEN
        RAISE EXCEPTION 'You can only update your own comments';
      END IF;

      IF p_text IS NULL OR TRIM(p_text) = '' THEN
        RAISE EXCEPTION 'Comment text is required';
      END IF;

      UPDATE comments SET
        text = p_text,
        updated_at = NOW()
      WHERE comments.id = p_comment_id
      RETURNING comments.id, comments.post_id, comments.user_id, comments.text, comments.created_at, comments.updated_at
      INTO id, post_id, user_id, text, created_at, updated_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_update_comment(UUID, TEXT) TO standard_user, speaker;

    -- Function: Soft delete comment
    CREATE OR REPLACE FUNCTION "user".fn_soft_delete_comment(p_comment_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_comment_user_id UUID;
      v_comment_deleted_at TIMESTAMPTZ;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT user_id, deleted_at INTO v_comment_user_id, v_comment_deleted_at
      FROM comments WHERE id = p_comment_id FOR UPDATE;

      IF v_comment_user_id IS NULL THEN
        RAISE EXCEPTION 'Comment not found';
      END IF;

      IF v_comment_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Comment already deleted';
      END IF;

      IF v_comment_user_id != v_user_id THEN
        RAISE EXCEPTION 'You can only delete your own comments';
      END IF;

      UPDATE comments SET deleted_at = NOW() WHERE id = p_comment_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".fn_soft_delete_comment(UUID) TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Drop functions
    REVOKE EXECUTE ON FUNCTION "user".fn_soft_delete_comment(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_soft_delete_comment(UUID);

    REVOKE EXECUTE ON FUNCTION "user".fn_update_comment(UUID, TEXT) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_update_comment(UUID, TEXT);

    REVOKE EXECUTE ON FUNCTION "user".fn_create_comment(UUID, TEXT) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_create_comment(UUID, TEXT);

    REVOKE EXECUTE ON FUNCTION "user".fn_unlike_post(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_unlike_post(UUID);

    REVOKE EXECUTE ON FUNCTION "user".fn_like_post(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_like_post(UUID);

    REVOKE EXECUTE ON FUNCTION "user".fn_soft_delete_post(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_soft_delete_post(UUID);

    REVOKE EXECUTE ON FUNCTION "user".fn_update_post(UUID, TEXT, TEXT[]) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_update_post(UUID, TEXT, TEXT[]);

    REVOKE EXECUTE ON FUNCTION "user".fn_create_post(TEXT, TEXT[]) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".fn_create_post(TEXT, TEXT[]);

    -- Drop admin views
    REVOKE SELECT ON admin.user_activity_v FROM moderator, owner;
    DROP VIEW IF EXISTS admin.user_activity_v;

    REVOKE SELECT ON admin.comments_v FROM moderator, owner;
    DROP VIEW IF EXISTS admin.comments_v;

    REVOKE SELECT ON admin.posts_v FROM moderator, owner;
    DROP VIEW IF EXISTS admin.posts_v;

    -- Drop user views
    REVOKE SELECT ON "user".post_comments_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".post_comments_v;

    REVOKE SELECT ON "user".my_posts_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".my_posts_v;

    REVOKE SELECT ON "user".post_with_details_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".post_with_details_v;

    REVOKE SELECT ON "user".posts_feed_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".posts_feed_v;

    -- Drop grants and policies for comments
    REVOKE SELECT ON comments FROM standard_user, speaker, moderator, owner;
    DROP POLICY IF EXISTS comments_select_admin ON comments;
    DROP POLICY IF EXISTS comments_select_user ON comments;
    ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

    -- Drop grants and policies for post_likes
    REVOKE SELECT ON post_likes FROM standard_user, speaker, moderator, owner;
    DROP POLICY IF EXISTS post_likes_select_admin ON post_likes;
    DROP POLICY IF EXISTS post_likes_select_user ON post_likes;
    ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;

    -- Drop grants and policies for posts
    REVOKE SELECT ON posts FROM standard_user, speaker, moderator, owner;
    DROP POLICY IF EXISTS posts_select_admin ON posts;
    DROP POLICY IF EXISTS posts_select_user ON posts;
    ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

    -- Drop trigger and trigger function
    DROP TRIGGER IF EXISTS trg_update_post_like_count ON post_likes;
    DROP FUNCTION IF EXISTS general.update_post_like_count();

    -- Drop indexes
    DROP INDEX IF EXISTS idx_connections_approved_lookup;
    DROP INDEX IF EXISTS idx_comments_not_deleted;
    DROP INDEX IF EXISTS idx_comments_created_at_id;
    DROP INDEX IF EXISTS idx_posts_not_deleted;
    DROP INDEX IF EXISTS idx_posts_created_at_id;

    -- Remove added columns from comments
    ALTER TABLE comments
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS updated_at;

    -- Remove added columns from posts
    ALTER TABLE posts
      DROP COLUMN IF EXISTS like_count,
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS updated_at;
  `);
}
