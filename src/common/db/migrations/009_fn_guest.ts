import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION guest.register_user(
      p_email TEXT,
      p_password TEXT,
      p_first_name TEXT,
      p_last_name TEXT,
      p_avatar_url TEXT DEFAULT NULL,
      p_position TEXT DEFAULT NULL,
      p_contact_info JSONB DEFAULT NULL,
      p_short_description TEXT DEFAULT NULL,
      p_interest_ids UUID[] DEFAULT '{}'
    )
    RETURNS UUID AS $$
    DECLARE
      v_role_exists BOOLEAN;
      v_user_id UUID;
      v_interest_id UUID;
    BEGIN
      IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
      END IF;

      SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = p_email) INTO v_role_exists;
      IF v_role_exists THEN
        RAISE EXCEPTION 'User already exists';
      END IF;

      IF EXISTS(SELECT 1 FROM users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User already exists';
      END IF;

      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', p_email, p_password);
      EXECUTE format('GRANT standard_user TO %I', p_email);

      INSERT INTO users (email, first_name, last_name, avatar_url, position, contact_info, short_description, status, role)
      VALUES (p_email, p_first_name, p_last_name, p_avatar_url, p_position, p_contact_info, p_short_description, 'pending', 'standard_user')
      RETURNING id INTO v_user_id;

      FOREACH v_interest_id IN ARRAY p_interest_ids
      LOOP
        INSERT INTO user_interests (user_id, interest_id) VALUES (v_user_id, v_interest_id);
      END LOOP;

      RETURN v_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION guest.user_exists_by_email(p_email TEXT)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_exists BOOLEAN;
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM pg_roles r
        WHERE r.rolname = p_email
          AND r.rolcanlogin = true
          AND (pg_has_role(r.rolname, 'standard_user', 'MEMBER') OR pg_has_role(r.rolname, 'speaker', 'MEMBER'))
      ) INTO v_exists;
      RETURN v_exists;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION guest.get_user_for_login(p_email TEXT)
    RETURNS TABLE(id UUID, email VARCHAR, status user_status) AS $$
    BEGIN
      RETURN QUERY SELECT u.id, u.email, u.status FROM users u WHERE u.email = p_email;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION guest.admin_exists_by_email(p_email TEXT)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_exists BOOLEAN;
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM pg_roles r
        WHERE r.rolname = p_email
          AND r.rolcanlogin = true
          AND (pg_has_role(r.rolname, 'moderator', 'MEMBER') OR pg_has_role(r.rolname, 'owner', 'MEMBER'))
      ) INTO v_exists;
      RETURN v_exists;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION guest.get_admin_for_login(p_email TEXT)
    RETURNS TABLE(email TEXT, role TEXT) AS $$
    BEGIN
      RETURN QUERY
      SELECT r.rolname::TEXT,
        CASE
          WHEN pg_has_role(r.rolname, 'owner', 'MEMBER') THEN 'owner'
          WHEN pg_has_role(r.rolname, 'moderator', 'MEMBER') THEN 'moderator'
        END
      FROM pg_roles r
      WHERE r.rolname = p_email
        AND r.rolcanlogin = true
        AND (pg_has_role(r.rolname, 'moderator', 'MEMBER') OR pg_has_role(r.rolname, 'owner', 'MEMBER'));
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    CREATE POLICY interests_select ON interests FOR SELECT
      TO guest, standard_user, speaker, moderator, owner
      USING (true);
    GRANT SELECT ON interests TO guest, standard_user, speaker, moderator, owner;

    GRANT EXECUTE ON FUNCTION guest.register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID[]) TO guest;
    GRANT EXECUTE ON FUNCTION guest.user_exists_by_email(TEXT) TO guest;
    GRANT EXECUTE ON FUNCTION guest.get_user_for_login(TEXT) TO guest;
    GRANT EXECUTE ON FUNCTION guest.admin_exists_by_email(TEXT) TO guest;
    GRANT EXECUTE ON FUNCTION guest.get_admin_for_login(TEXT) TO guest;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION guest.get_admin_for_login(TEXT) FROM guest;
    REVOKE EXECUTE ON FUNCTION guest.admin_exists_by_email(TEXT) FROM guest;
    REVOKE EXECUTE ON FUNCTION guest.get_user_for_login(TEXT) FROM guest;
    REVOKE EXECUTE ON FUNCTION guest.user_exists_by_email(TEXT) FROM guest;
    REVOKE EXECUTE ON FUNCTION guest.register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID[]) FROM guest;

    DROP FUNCTION IF EXISTS guest.get_admin_for_login(TEXT);
    DROP FUNCTION IF EXISTS guest.admin_exists_by_email(TEXT);
    DROP FUNCTION IF EXISTS guest.get_user_for_login(TEXT);
    DROP FUNCTION IF EXISTS guest.user_exists_by_email(TEXT);
    DROP FUNCTION IF EXISTS guest.register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID[]);

    REVOKE SELECT ON interests FROM guest, standard_user, speaker, moderator, owner;
    DROP POLICY IF EXISTS interests_select ON interests;
  `);
}
