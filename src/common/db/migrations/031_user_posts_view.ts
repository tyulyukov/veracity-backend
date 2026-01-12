import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE VIEW "user".user_posts_v AS
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
        CROSS JOIN current_user_id cu
        WHERE pl.post_id = p.id AND pl.user_id = cu.id
      ) AS is_liked_by_current_user
    FROM posts p
    CROSS JOIN current_user_id cu
    JOIN connected_users conn ON p.author_id = conn.user_id
    JOIN users author ON p.author_id = author.id
    LEFT JOIN post_comment_counts pcc ON p.id = pcc.post_id
    WHERE p.deleted_at IS NULL
      AND author.status = 'active';

    GRANT SELECT ON "user".user_posts_v TO standard_user, speaker;

    CREATE INDEX IF NOT EXISTS idx_posts_author_created_id ON posts(author_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_posts_author_created_id;
    REVOKE SELECT ON "user".user_posts_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".user_posts_v;
  `);
}
