import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_otp_codes_email;
    CREATE UNIQUE INDEX idx_otp_codes_email ON otp_codes(email);

    ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

    CREATE OR REPLACE FUNCTION guest.create_otp(
      p_email TEXT,
      p_expires_in_minutes INT DEFAULT 10
    )
    RETURNS TEXT AS $$
    DECLARE
      v_code TEXT;
      v_existing_created_at TIMESTAMPTZ;
    BEGIN
      DELETE FROM otp_codes WHERE expires_at < NOW();

      IF NOT guest.user_exists_by_email(p_email) THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      SELECT created_at INTO v_existing_created_at
      FROM otp_codes
      WHERE email = p_email;

      IF v_existing_created_at IS NOT NULL AND v_existing_created_at > NOW() - INTERVAL '2 minutes' THEN
        RAISE EXCEPTION 'OTP request rate limit exceeded';
      END IF;

      v_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

      INSERT INTO otp_codes (email, code, expires_at, attempts, created_at)
      VALUES (p_email, v_code, NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL, 0, NOW())
      ON CONFLICT (email) DO UPDATE SET
        code = EXCLUDED.code,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        created_at = NOW();

      RETURN v_code;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION guest.check_otp_attempts(p_email TEXT)
    RETURNS TABLE(otp_code VARCHAR(10), attempt_count INT) AS $$
    BEGIN
      DELETE FROM otp_codes WHERE expires_at < NOW();

      RETURN QUERY
      UPDATE otp_codes o
      SET attempts = o.attempts + 1
      WHERE o.email = p_email
      RETURNING o.code, o.attempts;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION guest.reset_password_with_otp(
      p_email TEXT,
      p_new_password TEXT
    )
    RETURNS VOID AS $$
    BEGIN
      DELETE FROM otp_codes WHERE email = p_email;
      EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', p_email, p_new_password);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION guest.create_otp(TEXT, INT) TO guest;
    GRANT EXECUTE ON FUNCTION guest.check_otp_attempts(TEXT) TO guest;
    GRANT EXECUTE ON FUNCTION guest.reset_password_with_otp(TEXT, TEXT) TO guest;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION guest.reset_password_with_otp(TEXT, TEXT) FROM guest;
    REVOKE EXECUTE ON FUNCTION guest.check_otp_attempts(TEXT) FROM guest;
    REVOKE EXECUTE ON FUNCTION guest.create_otp(TEXT, INT) FROM guest;

    DROP FUNCTION IF EXISTS guest.reset_password_with_otp(TEXT, TEXT);
    DROP FUNCTION IF EXISTS guest.check_otp_attempts(TEXT);
    DROP FUNCTION IF EXISTS guest.create_otp(TEXT, INT);

    ALTER TABLE otp_codes DROP COLUMN IF EXISTS attempts;

    DROP INDEX IF EXISTS idx_otp_codes_email;
    CREATE INDEX idx_otp_codes_email ON otp_codes(email);
  `);
}

