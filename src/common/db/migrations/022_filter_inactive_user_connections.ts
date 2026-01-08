import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP VIEW IF EXISTS admin.users_with_interests_v;

    CREATE VIEW admin.users_with_interests_v AS
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.position,
      u.contact_info, u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
      COALESCE(
        json_agg(json_build_object('id', i.id, 'name', i.name))
        FILTER (WHERE i.id IS NOT NULL), '[]'::json
      ) AS interests,
      (
        SELECT COUNT(*)::int
        FROM connections c
        JOIN users other_user ON (
          CASE 
            WHEN c.requester_user_id = u.id THEN c.target_user_id = other_user.id
            ELSE c.requester_user_id = other_user.id
          END
        )
        WHERE c.status = 'approved'
          AND (c.requester_user_id = u.id OR c.target_user_id = u.id)
          AND other_user.status = 'active'
      ) AS total_connections,
      (
        SELECT COUNT(*)::int
        FROM connections c
        JOIN users target_user ON c.target_user_id = target_user.id
        WHERE c.status = 'pending'
          AND c.requester_user_id = u.id
          AND target_user.status = 'active'
      ) AS pending_sent_count,
      (
        SELECT COUNT(*)::int
        FROM connections c
        JOIN users requester_user ON c.requester_user_id = requester_user.id
        WHERE c.status = 'pending'
          AND c.target_user_id = u.id
          AND requester_user.status = 'active'
      ) AS pending_received_count
    FROM users u
    LEFT JOIN user_interests ui ON ui.user_id = u.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    GROUP BY u.id;

    GRANT SELECT ON admin.users_with_interests_v TO moderator, owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP VIEW IF EXISTS admin.users_with_interests_v;

    CREATE VIEW admin.users_with_interests_v AS
    SELECT 
      u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.position,
      u.contact_info, u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
      COALESCE(
        json_agg(json_build_object('id', i.id, 'name', i.name))
        FILTER (WHERE i.id IS NOT NULL), '[]'::json
      ) AS interests,
      (
        SELECT COUNT(*)::int
        FROM connections c
        JOIN users other_user ON (
          CASE 
            WHEN c.requester_user_id = u.id THEN c.target_user_id = other_user.id
            ELSE c.requester_user_id = other_user.id
          END
        )
        WHERE c.status = 'approved'
          AND (c.requester_user_id = u.id OR c.target_user_id = u.id)
          AND other_user.status = 'active'
      ) AS total_connections,
      (
        SELECT COUNT(*)::int
        FROM connections c
        WHERE c.status = 'pending'
          AND c.requester_user_id = u.id
      ) AS pending_sent_count,
      (
        SELECT COUNT(*)::int
        FROM connections c
        WHERE c.status = 'pending'
          AND c.target_user_id = u.id
      ) AS pending_received_count
    FROM users u
    LEFT JOIN user_interests ui ON ui.user_id = u.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    GROUP BY u.id;

    GRANT SELECT ON admin.users_with_interests_v TO moderator, owner;
  `);
}
