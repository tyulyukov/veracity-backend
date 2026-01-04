import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION general.get_current_role()
    RETURNS TEXT AS $$
    DECLARE
      v_role_name TEXT;
    BEGIN
      SELECT CASE
        WHEN pg_has_role(session_user, 'owner', 'MEMBER') THEN 'owner'
        WHEN pg_has_role(session_user, 'moderator', 'MEMBER') THEN 'moderator'
        WHEN pg_has_role(session_user, 'speaker', 'MEMBER') THEN 'speaker'
        WHEN pg_has_role(session_user, 'standard_user', 'MEMBER') THEN 'standard_user'
        WHEN session_user = 'guest' THEN 'guest'
        ELSE 'unknown'
      END INTO v_role_name;
      RETURN v_role_name;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION general.get_current_role() TO guest, standard_user, speaker, moderator, owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION general.get_current_role() FROM guest, standard_user, speaker, moderator, owner;
    DROP FUNCTION IF EXISTS general.get_current_role();
  `);
}
