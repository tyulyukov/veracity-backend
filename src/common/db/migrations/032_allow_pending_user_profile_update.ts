import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
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

      IF v_caller_status NOT IN ('active', 'pending') THEN
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
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
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
  `);
}
