import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION "user".touch_activity()
    RETURNS VOID AS $$
    DECLARE
      v_user_id UUID;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RETURN;
      END IF;

      SELECT id INTO v_user_id FROM users WHERE email = session_user AND status = 'active';

      IF v_user_id IS NOT NULL THEN
        UPDATE users SET last_activity_at = NOW() WHERE id = v_user_id;
      END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".touch_activity() TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION "user".touch_activity() FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".touch_activity();
  `);
}
