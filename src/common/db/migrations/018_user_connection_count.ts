import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP VIEW IF EXISTS "user".user_detail_with_connection_v;

    CREATE VIEW "user".user_detail_with_connection_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    )
    SELECT 
      u.id, u.first_name, u.last_name, u.avatar_url, u.position,
      u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM connections c
          WHERE c.status = 'approved'
            AND ((c.requester_user_id = u.id AND c.target_user_id = cu.id)
              OR (c.requester_user_id = cu.id AND c.target_user_id = u.id))
        ) THEN u.contact_info
        ELSE NULL
      END AS contact_info,
      COALESCE(
        json_agg(json_build_object('id', i.id, 'name', i.name))
        FILTER (WHERE i.id IS NOT NULL), '[]'::json
      ) AS interests,
      EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'approved'
          AND ((c.requester_user_id = u.id AND c.target_user_id = cu.id)
            OR (c.requester_user_id = cu.id AND c.target_user_id = u.id))
      ) AS is_connected,
      EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'pending'
          AND c.requester_user_id = cu.id
          AND c.target_user_id = u.id
      ) AS has_outgoing_request,
      EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'pending'
          AND c.requester_user_id = u.id
          AND c.target_user_id = cu.id
      ) AS has_incoming_request,
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
      ) AS total_connections
    FROM users u
    CROSS JOIN current_user_id cu
    LEFT JOIN user_interests ui ON ui.user_id = u.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    WHERE u.status = 'active'
    GROUP BY u.id, cu.id, u.contact_info;

    GRANT SELECT ON "user".user_detail_with_connection_v TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP VIEW IF EXISTS "user".user_detail_with_connection_v;

    CREATE VIEW "user".user_detail_with_connection_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    )
    SELECT 
      u.id, u.first_name, u.last_name, u.avatar_url, u.position,
      u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM connections c
          WHERE c.status = 'approved'
            AND ((c.requester_user_id = u.id AND c.target_user_id = cu.id)
              OR (c.requester_user_id = cu.id AND c.target_user_id = u.id))
        ) THEN u.contact_info
        ELSE NULL
      END AS contact_info,
      COALESCE(
        json_agg(json_build_object('id', i.id, 'name', i.name))
        FILTER (WHERE i.id IS NOT NULL), '[]'::json
      ) AS interests,
      EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'approved'
          AND ((c.requester_user_id = u.id AND c.target_user_id = cu.id)
            OR (c.requester_user_id = cu.id AND c.target_user_id = u.id))
      ) AS is_connected,
      EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'pending'
          AND c.requester_user_id = cu.id
          AND c.target_user_id = u.id
      ) AS has_outgoing_request,
      EXISTS (
        SELECT 1 FROM connections c
        WHERE c.status = 'pending'
          AND c.requester_user_id = u.id
          AND c.target_user_id = cu.id
      ) AS has_incoming_request
    FROM users u
    CROSS JOIN current_user_id cu
    LEFT JOIN user_interests ui ON ui.user_id = u.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    WHERE u.status = 'active'
    GROUP BY u.id, cu.id, u.contact_info;

    GRANT SELECT ON "user".user_detail_with_connection_v TO standard_user, speaker;
  `);
}
