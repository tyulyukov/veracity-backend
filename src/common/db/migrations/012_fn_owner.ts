import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION owner.create_moderator(p_email TEXT, p_password TEXT)
    RETURNS VOID AS $$
    DECLARE
      v_role_exists BOOLEAN;
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can create moderators';
      END IF;

      IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
      END IF;

      SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = p_email) INTO v_role_exists;
      IF v_role_exists THEN
        RAISE EXCEPTION 'User already exists';
      END IF;

      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', p_email, p_password);
      EXECUTE format('GRANT moderator TO %I', p_email);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION owner.drop_moderator(p_email TEXT)
    RETURNS VOID AS $$
    DECLARE
      v_role_exists BOOLEAN;
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can drop moderators';
      END IF;

      SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = p_email) INTO v_role_exists;
      IF NOT v_role_exists THEN
        RAISE EXCEPTION 'Moderator does not exist';
      END IF;

      IF NOT pg_has_role(p_email, 'moderator', 'MEMBER') THEN
        RAISE EXCEPTION 'Can only drop moderators';
      END IF;

      EXECUTE format('REASSIGN OWNED BY %I TO postgres', p_email);
      EXECUTE format('DROP OWNED BY %I', p_email);
      EXECUTE format('DROP ROLE %I', p_email);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION owner.list_moderators(
      p_search TEXT DEFAULT NULL,
      p_limit INT DEFAULT 20,
      p_offset INT DEFAULT 0
    )
    RETURNS TABLE(email TEXT) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can list moderators';
      END IF;

      RETURN QUERY
      SELECT r.rolname::TEXT
      FROM pg_roles r
      WHERE pg_has_role(r.rolname, 'moderator', 'MEMBER')
        AND r.rolcanlogin = true
        AND NOT pg_has_role(r.rolname, 'owner', 'MEMBER')
        AND (p_search IS NULL OR LOWER(r.rolname) LIKE '%' || LOWER(p_search) || '%')
      ORDER BY r.rolname
      LIMIT p_limit OFFSET p_offset;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION owner.count_moderators(p_search TEXT DEFAULT NULL)
    RETURNS BIGINT AS $$
    DECLARE
      v_count BIGINT;
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can count moderators';
      END IF;

      SELECT COUNT(*) INTO v_count
      FROM pg_roles r
      WHERE pg_has_role(r.rolname, 'moderator', 'MEMBER')
        AND r.rolcanlogin = true
        AND NOT pg_has_role(r.rolname, 'owner', 'MEMBER')
        AND (p_search IS NULL OR LOWER(r.rolname) LIKE '%' || LOWER(p_search) || '%');

      RETURN v_count;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.create_moderator(TEXT, TEXT) TO owner;
    GRANT EXECUTE ON FUNCTION owner.drop_moderator(TEXT) TO owner;
    GRANT EXECUTE ON FUNCTION owner.list_moderators(TEXT, INT, INT) TO owner;
    GRANT EXECUTE ON FUNCTION owner.count_moderators(TEXT) TO owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION owner.count_moderators(TEXT) FROM owner;
    REVOKE EXECUTE ON FUNCTION owner.list_moderators(TEXT, INT, INT) FROM owner;
    REVOKE EXECUTE ON FUNCTION owner.drop_moderator(TEXT) FROM owner;
    REVOKE EXECUTE ON FUNCTION owner.create_moderator(TEXT, TEXT) FROM owner;

    DROP FUNCTION IF EXISTS owner.count_moderators(TEXT);
    DROP FUNCTION IF EXISTS owner.list_moderators(TEXT, INT, INT);
    DROP FUNCTION IF EXISTS owner.drop_moderator(TEXT);
    DROP FUNCTION IF EXISTS owner.create_moderator(TEXT, TEXT);
  `);
}
