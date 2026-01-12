import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Drop the existing admin.user_activity_v view
    DROP VIEW IF EXISTS admin.user_activity_v;

    -- Recreate admin.user_activity_v with image_urls column
    CREATE VIEW admin.user_activity_v AS
    SELECT
      user_id,
      activity_type,
      entity_id,
      entity_type,
      content_preview,
      image_urls,
      activity_at
    FROM (
      -- Post created
      SELECT
        author_id AS user_id,
        'post_created' AS activity_type,
        id AS entity_id,
        'post' AS entity_type,
        LEFT(text, 100) AS content_preview,
        image_urls,
        created_at AS activity_at
      FROM posts
      WHERE deleted_at IS NULL

      UNION ALL

      -- Post deleted
      SELECT
        author_id AS user_id,
        'post_deleted' AS activity_type,
        id AS entity_id,
        'post' AS entity_type,
        LEFT(text, 100) AS content_preview,
        image_urls,
        deleted_at AS activity_at
      FROM posts
      WHERE deleted_at IS NOT NULL

      UNION ALL

      -- Liked
      SELECT
        user_id,
        'liked' AS activity_type,
        post_id AS entity_id,
        'post' AS entity_type,
        NULL AS content_preview,
        NULL::TEXT[] AS image_urls,
        created_at AS activity_at
      FROM post_likes

      UNION ALL

      -- Commented
      SELECT
        user_id,
        'commented' AS activity_type,
        id AS entity_id,
        'comment' AS entity_type,
        LEFT(text, 100) AS content_preview,
        NULL::TEXT[] AS image_urls,
        created_at AS activity_at
      FROM comments
      WHERE deleted_at IS NULL
    ) AS activities;

    GRANT SELECT ON admin.user_activity_v TO moderator, owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Drop the modified view
    DROP VIEW IF EXISTS admin.user_activity_v;

    -- Recreate the original view without image_urls
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
  `);
}
