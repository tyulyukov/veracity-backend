import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE VIEW "user".user_connections_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    ),
    expanded_connections AS (
      SELECT 
        c.requester_user_id AS profile_owner_id,
        c.target_user_id AS connected_user_id,
        c.created_at AS connection_created_at
      FROM connections c
      WHERE c.status = 'approved'
      UNION ALL
      SELECT 
        c.target_user_id AS profile_owner_id,
        c.requester_user_id AS connected_user_id,
        c.created_at AS connection_created_at
      FROM connections c
      WHERE c.status = 'approved'
    )
    SELECT 
      ec.profile_owner_id,
      ec.connection_created_at,
      connected_user.id,
      connected_user.first_name,
      connected_user.last_name,
      connected_user.avatar_url,
      connected_user.position,
      connected_user.short_description,
      connected_user.status,
      connected_user.role,
      connected_user.created_at,
      connected_user.last_activity_at,
      COALESCE(
        json_agg(json_build_object('id', i.id, 'name', i.name))
        FILTER (WHERE i.id IS NOT NULL), '[]'::json
      ) AS interests,
      EXISTS (
        SELECT 1 FROM connections conn
        WHERE conn.status = 'approved'
          AND ((conn.requester_user_id = connected_user.id AND conn.target_user_id = cu.id)
            OR (conn.requester_user_id = cu.id AND conn.target_user_id = connected_user.id))
      ) AS is_connected,
      EXISTS (
        SELECT 1 FROM connections conn
        WHERE conn.status = 'pending'
          AND conn.requester_user_id = cu.id
          AND conn.target_user_id = connected_user.id
      ) AS has_outgoing_request,
      EXISTS (
        SELECT 1 FROM connections conn
        WHERE conn.status = 'pending'
          AND conn.requester_user_id = connected_user.id
          AND conn.target_user_id = cu.id
      ) AS has_incoming_request
    FROM expanded_connections ec
    CROSS JOIN current_user_id cu
    JOIN users profile_owner ON ec.profile_owner_id = profile_owner.id
    JOIN users connected_user ON ec.connected_user_id = connected_user.id
    LEFT JOIN user_interests ui ON ui.user_id = connected_user.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    WHERE connected_user.status = 'active'
      AND profile_owner.status = 'active'
    GROUP BY ec.profile_owner_id, ec.connection_created_at, connected_user.id, cu.id;

    GRANT SELECT ON "user".user_connections_v TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE SELECT ON "user".user_connections_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".user_connections_v;
  `);
}
