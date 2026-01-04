import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE POLICY users_select_admin ON users FOR SELECT TO moderator, owner USING (true);
    CREATE POLICY user_interests_select_admin ON user_interests FOR SELECT TO moderator, owner USING (true);

    GRANT SELECT ON users TO moderator, owner;
    GRANT SELECT ON user_interests TO moderator, owner;

    CREATE VIEW admin.users_with_interests_v AS
    SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.position,
           u.contact_info, u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
           COALESCE(
             json_agg(json_build_object('id', i.id, 'name', i.name))
             FILTER (WHERE i.id IS NOT NULL), '[]'::json
           ) AS interests
    FROM users u
    LEFT JOIN user_interests ui ON ui.user_id = u.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    GROUP BY u.id;

    GRANT SELECT ON admin.users_with_interests_v TO moderator, owner;

    CREATE OR REPLACE FUNCTION admin.update_user_status(p_user_id UUID, p_status TEXT)
    RETURNS VOID AS $$
    DECLARE
      v_exists BOOLEAN;
    BEGIN
      IF NOT (pg_has_role(session_user, 'moderator', 'MEMBER') OR pg_has_role(session_user, 'owner', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      IF p_status NOT IN ('pending', 'active', 'inactive') THEN
        RAISE EXCEPTION 'Invalid status';
      END IF;

      SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_exists;
      IF NOT v_exists THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      UPDATE users SET status = p_status::user_status WHERE id = p_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION admin.update_user_role(p_email TEXT, p_new_role TEXT)
    RETURNS VOID AS $$
    DECLARE
      v_role_exists BOOLEAN;
      v_current_role TEXT;
    BEGIN
      IF NOT (pg_has_role(session_user, 'moderator', 'MEMBER') OR pg_has_role(session_user, 'owner', 'MEMBER')) THEN
        RAISE EXCEPTION 'Only moderator or owner can update user roles';
      END IF;

      IF p_new_role NOT IN ('standard_user', 'speaker') THEN
        RAISE EXCEPTION 'Invalid role. Must be standard_user or speaker';
      END IF;

      SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = p_email) INTO v_role_exists;
      IF NOT v_role_exists THEN
        RAISE EXCEPTION 'User does not exist';
      END IF;

      IF pg_has_role(p_email, 'owner', 'MEMBER') OR pg_has_role(p_email, 'moderator', 'MEMBER') THEN
        RAISE EXCEPTION 'Cannot modify admin user roles';
      END IF;

      IF pg_has_role(p_email, 'speaker', 'MEMBER') THEN
        v_current_role := 'speaker';
      ELSIF pg_has_role(p_email, 'standard_user', 'MEMBER') THEN
        v_current_role := 'standard_user';
      ELSE
        RAISE EXCEPTION 'User has no valid role';
      END IF;

      IF v_current_role = p_new_role THEN
        RETURN;
      END IF;

      EXECUTE format('REVOKE %I FROM %I', v_current_role, p_email);
      EXECUTE format('GRANT %I TO %I', p_new_role, p_email);

      UPDATE users SET role = p_new_role::user_role WHERE email = p_email;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION admin.create_interest(p_name TEXT)
    RETURNS UUID AS $$
    DECLARE
      v_id UUID;
    BEGIN
      IF NOT (pg_has_role(session_user, 'moderator', 'MEMBER') OR pg_has_role(session_user, 'owner', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      IF EXISTS(SELECT 1 FROM interests WHERE LOWER(name) = LOWER(p_name)) THEN
        RAISE EXCEPTION 'Interest already exists';
      END IF;

      INSERT INTO interests (name) VALUES (p_name) RETURNING id INTO v_id;
      RETURN v_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION admin.update_interest(p_id UUID, p_name TEXT)
    RETURNS VOID AS $$
    BEGIN
      IF NOT (pg_has_role(session_user, 'moderator', 'MEMBER') OR pg_has_role(session_user, 'owner', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      IF NOT EXISTS(SELECT 1 FROM interests WHERE id = p_id) THEN
        RAISE EXCEPTION 'Interest not found';
      END IF;

      IF EXISTS(SELECT 1 FROM interests WHERE LOWER(name) = LOWER(p_name) AND id != p_id) THEN
        RAISE EXCEPTION 'Interest name already exists';
      END IF;

      UPDATE interests SET name = p_name WHERE id = p_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION admin.delete_interest(p_id UUID)
    RETURNS VOID AS $$
    BEGIN
      IF NOT (pg_has_role(session_user, 'moderator', 'MEMBER') OR pg_has_role(session_user, 'owner', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      IF NOT EXISTS(SELECT 1 FROM interests WHERE id = p_id) THEN
        RAISE EXCEPTION 'Interest not found';
      END IF;

      DELETE FROM interests WHERE id = p_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION admin.update_user_status(UUID, TEXT) TO moderator, owner;
    GRANT EXECUTE ON FUNCTION admin.update_user_role(TEXT, TEXT) TO moderator, owner;
    GRANT EXECUTE ON FUNCTION admin.create_interest(TEXT) TO moderator, owner;
    GRANT EXECUTE ON FUNCTION admin.update_interest(UUID, TEXT) TO moderator, owner;
    GRANT EXECUTE ON FUNCTION admin.delete_interest(UUID) TO moderator, owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION admin.delete_interest(UUID) FROM moderator, owner;
    REVOKE EXECUTE ON FUNCTION admin.update_interest(UUID, TEXT) FROM moderator, owner;
    REVOKE EXECUTE ON FUNCTION admin.create_interest(TEXT) FROM moderator, owner;
    REVOKE EXECUTE ON FUNCTION admin.update_user_role(TEXT, TEXT) FROM moderator, owner;
    REVOKE EXECUTE ON FUNCTION admin.update_user_status(UUID, TEXT) FROM moderator, owner;

    DROP FUNCTION IF EXISTS admin.delete_interest(UUID);
    DROP FUNCTION IF EXISTS admin.update_interest(UUID, TEXT);
    DROP FUNCTION IF EXISTS admin.create_interest(TEXT);
    DROP FUNCTION IF EXISTS admin.update_user_role(TEXT, TEXT);
    DROP FUNCTION IF EXISTS admin.update_user_status(UUID, TEXT);

    REVOKE SELECT ON admin.users_with_interests_v FROM moderator, owner;
    DROP VIEW IF EXISTS admin.users_with_interests_v;

    REVOKE SELECT ON user_interests FROM moderator, owner;
    REVOKE SELECT ON users FROM moderator, owner;

    DROP POLICY IF EXISTS user_interests_select_admin ON user_interests;
    DROP POLICY IF EXISTS users_select_admin ON users;
  `);
}
