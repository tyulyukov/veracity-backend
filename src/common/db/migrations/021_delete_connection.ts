import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION "user".delete_connection(p_other_user_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_caller_id UUID;
      v_caller_status user_status;
      v_deleted_count INTEGER;
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

      DELETE FROM connections cn
      WHERE (cn.requester_user_id = v_caller_id AND cn.target_user_id = p_other_user_id)
         OR (cn.requester_user_id = p_other_user_id AND cn.target_user_id = v_caller_id);

      GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

      IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'Connection not found';
      END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".delete_connection(UUID) TO standard_user, speaker;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION "user".delete_connection(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".delete_connection(UUID);
  `);
}
