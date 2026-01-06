import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

    CREATE POLICY connections_select_own ON connections FOR SELECT TO standard_user, speaker
      USING (
        EXISTS (SELECT 1 FROM users WHERE email = session_user AND (id = requester_user_id OR id = target_user_id))
      );

    CREATE POLICY connections_select_admin ON connections FOR SELECT TO moderator, owner USING (true);

    GRANT SELECT ON connections TO standard_user, speaker, moderator, owner;

    CREATE OR REPLACE FUNCTION general.get_current_user_id()
    RETURNS UUID AS $$
    DECLARE
      v_user_id UUID;
    BEGIN
      SELECT id INTO v_user_id FROM users WHERE email = session_user;
      RETURN v_user_id;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION general.get_current_user_id() TO standard_user, speaker;

    CREATE OR REPLACE VIEW "user".users_with_connections_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    )
    SELECT 
      u.id, u.first_name, u.last_name, u.avatar_url, u.position,
      u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
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
    WHERE u.status = 'active' AND u.id != cu.id
    GROUP BY u.id, cu.id;

    GRANT SELECT ON "user".users_with_connections_v TO standard_user, speaker;

    CREATE OR REPLACE VIEW "user".user_detail_with_connection_v AS
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

    CREATE OR REPLACE FUNCTION "user".send_connection_request(p_target_user_id UUID)
    RETURNS TABLE (
      requester_user_id UUID,
      target_user_id UUID,
      status connection_status,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      was_auto_approved BOOLEAN
    ) AS $$
    DECLARE
      v_caller_id UUID;
      v_caller_status user_status;
      v_target_status user_status;
      v_existing_connection RECORD;
      v_was_auto_approved BOOLEAN := FALSE;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_caller_id, v_caller_status FROM users u WHERE u.email = session_user;

      IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_caller_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      IF v_caller_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot connect to self';
      END IF;

      SELECT u.status INTO v_target_status FROM users u WHERE u.id = p_target_user_id;
      
      IF v_target_status IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
      END IF;

      IF v_target_status != 'active' THEN
        RAISE EXCEPTION 'Target user is not active';
      END IF;

      SELECT * INTO v_existing_connection FROM connections c
      WHERE (c.requester_user_id = v_caller_id AND c.target_user_id = p_target_user_id)
         OR (c.requester_user_id = p_target_user_id AND c.target_user_id = v_caller_id)
      FOR UPDATE;

      IF v_existing_connection IS NOT NULL THEN
        IF v_existing_connection.status = 'approved' THEN
          RAISE EXCEPTION 'Connection already exists';
        END IF;

        IF v_existing_connection.requester_user_id = v_caller_id THEN
          IF v_existing_connection.status = 'pending' THEN
            RAISE EXCEPTION 'Connection request already sent';
          ELSE
            DELETE FROM connections cn
            WHERE cn.requester_user_id = v_caller_id AND cn.target_user_id = p_target_user_id;
          END IF;
        ELSE
          IF v_existing_connection.status = 'pending' THEN
            UPDATE connections cn SET status = 'approved', updated_at = NOW()
            WHERE cn.requester_user_id = p_target_user_id AND cn.target_user_id = v_caller_id;
            
            v_was_auto_approved := TRUE;
            
            RETURN QUERY SELECT c.requester_user_id, c.target_user_id, c.status, c.created_at, c.updated_at, v_was_auto_approved
            FROM connections c
            WHERE c.requester_user_id = p_target_user_id AND c.target_user_id = v_caller_id;
            RETURN;
          ELSE
            DELETE FROM connections cn
            WHERE cn.requester_user_id = p_target_user_id AND cn.target_user_id = v_caller_id;
          END IF;
        END IF;
      END IF;

      INSERT INTO connections (requester_user_id, target_user_id, status, created_at, updated_at)
      VALUES (v_caller_id, p_target_user_id, 'pending', NOW(), NOW());

      RETURN QUERY SELECT c.requester_user_id, c.target_user_id, c.status, c.created_at, c.updated_at, v_was_auto_approved
      FROM connections c
      WHERE c.requester_user_id = v_caller_id AND c.target_user_id = p_target_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".send_connection_request(UUID) TO standard_user, speaker;

    CREATE OR REPLACE FUNCTION "user".delete_connection_request(p_target_user_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_caller_id UUID;
      v_caller_status user_status;
      v_connection_status connection_status;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_caller_id, v_caller_status FROM users u WHERE u.email = session_user;

      IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_caller_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT status INTO v_connection_status FROM connections
      WHERE requester_user_id = v_caller_id AND target_user_id = p_target_user_id
      FOR UPDATE;

      IF v_connection_status IS NULL THEN
        RAISE EXCEPTION 'Connection request not found';
      END IF;

      IF v_connection_status != 'pending' THEN
        RAISE EXCEPTION 'Can only delete pending requests';
      END IF;

      DELETE FROM connections cn
      WHERE cn.requester_user_id = v_caller_id AND cn.target_user_id = p_target_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".delete_connection_request(UUID) TO standard_user, speaker;

    CREATE OR REPLACE FUNCTION "user".respond_to_connection(p_requester_user_id UUID, p_response TEXT)
    RETURNS TABLE (
      requester_user_id UUID,
      target_user_id UUID,
      status connection_status,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_caller_id UUID;
      v_caller_status user_status;
      v_connection_status connection_status;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      IF p_response NOT IN ('approved', 'ignored') THEN
        RAISE EXCEPTION 'Invalid response. Must be approved or ignored';
      END IF;

      SELECT u.id, u.status INTO v_caller_id, v_caller_status FROM users u WHERE u.email = session_user;

      IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_caller_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT c.status INTO v_connection_status FROM connections c
      WHERE c.requester_user_id = p_requester_user_id AND c.target_user_id = v_caller_id
      FOR UPDATE;

      IF v_connection_status IS NULL THEN
        RAISE EXCEPTION 'Connection request not found';
      END IF;

      IF v_connection_status != 'pending' THEN
        RAISE EXCEPTION 'Can only respond to pending requests';
      END IF;

      UPDATE connections c SET status = p_response::connection_status, updated_at = NOW()
      WHERE c.requester_user_id = p_requester_user_id AND c.target_user_id = v_caller_id;

      RETURN QUERY SELECT c.requester_user_id, c.target_user_id, c.status, c.created_at, c.updated_at
      FROM connections c
      WHERE c.requester_user_id = p_requester_user_id AND c.target_user_id = v_caller_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".respond_to_connection(UUID, TEXT) TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION "user".respond_to_connection(UUID, TEXT) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".respond_to_connection(UUID, TEXT);

    REVOKE EXECUTE ON FUNCTION "user".delete_connection_request(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".delete_connection_request(UUID);

    REVOKE EXECUTE ON FUNCTION "user".send_connection_request(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".send_connection_request(UUID);

    REVOKE SELECT ON "user".user_detail_with_connection_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".user_detail_with_connection_v;

    REVOKE SELECT ON "user".users_with_connections_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".users_with_connections_v;

    REVOKE EXECUTE ON FUNCTION general.get_current_user_id() FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS general.get_current_user_id();

    REVOKE SELECT ON connections FROM standard_user, speaker, moderator, owner;

    DROP POLICY IF EXISTS connections_select_admin ON connections;
    DROP POLICY IF EXISTS connections_select_own ON connections;

    ALTER TABLE connections DISABLE ROW LEVEL SECURITY;
  `);
}
