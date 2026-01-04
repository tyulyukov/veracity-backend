import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION general.is_session_user_active()
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (SELECT 1 FROM users WHERE email = session_user AND status = 'active');
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION general.is_session_user_active() TO standard_user, speaker;

    CREATE POLICY users_select_self ON users FOR SELECT TO standard_user, speaker
      USING (email = session_user);

    CREATE POLICY users_select_active ON users FOR SELECT TO standard_user, speaker
      USING (status = 'active' AND general.is_session_user_active());

    CREATE POLICY user_interests_select ON user_interests FOR SELECT TO standard_user, speaker
      USING (EXISTS (SELECT 1 FROM users WHERE id = user_id));

    GRANT SELECT ON users TO standard_user, speaker;
    GRANT SELECT ON user_interests TO standard_user, speaker;

    CREATE VIEW "user".other_active_users_v AS
    SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.position,
           u.short_description, u.status, u.role, u.created_at, u.last_activity_at,
           COALESCE(
             json_agg(json_build_object('id', i.id, 'name', i.name))
             FILTER (WHERE i.id IS NOT NULL), '[]'::json
           ) AS interests
    FROM users u
    LEFT JOIN user_interests ui ON ui.user_id = u.id
    LEFT JOIN interests i ON i.id = ui.interest_id
    WHERE u.status = 'active' AND u.email != session_user
    GROUP BY u.id;

    GRANT SELECT ON "user".other_active_users_v TO standard_user, speaker;

    CREATE OR REPLACE FUNCTION "user".update_profile(
      p_first_name TEXT DEFAULT NULL,
      p_last_name TEXT DEFAULT NULL,
      p_avatar_url TEXT DEFAULT NULL,
      p_position TEXT DEFAULT NULL,
      p_contact_info JSONB DEFAULT NULL,
      p_short_description TEXT DEFAULT NULL,
      p_interest_ids UUID[] DEFAULT NULL
    )
    RETURNS UUID AS $$
    DECLARE
      v_caller_email TEXT := session_user;
      v_user_id UUID;
      v_caller_status user_status;
      v_interest_id UUID;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT id, status INTO v_user_id, v_caller_status FROM users WHERE email = v_caller_email;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_caller_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      UPDATE users SET
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        position = COALESCE(p_position, position),
        contact_info = COALESCE(p_contact_info, contact_info),
        short_description = COALESCE(p_short_description, short_description),
        last_activity_at = NOW()
      WHERE id = v_user_id;

      IF p_interest_ids IS NOT NULL THEN
        DELETE FROM user_interests WHERE user_id = v_user_id;
        FOREACH v_interest_id IN ARRAY p_interest_ids
        LOOP
          INSERT INTO user_interests (user_id, interest_id) VALUES (v_user_id, v_interest_id);
        END LOOP;
      END IF;

      RETURN v_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".update_profile(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID[]) TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION "user".update_profile(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID[]) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".update_profile(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID[]);

    REVOKE SELECT ON "user".other_active_users_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".other_active_users_v;

    REVOKE SELECT ON user_interests FROM standard_user, speaker;
    REVOKE SELECT ON users FROM standard_user, speaker;

    DROP POLICY IF EXISTS user_interests_select ON user_interests;
    DROP POLICY IF EXISTS users_select_active ON users;
    DROP POLICY IF EXISTS users_select_self ON users;

    REVOKE EXECUTE ON FUNCTION general.is_session_user_active() FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS general.is_session_user_active();
  `);
}
