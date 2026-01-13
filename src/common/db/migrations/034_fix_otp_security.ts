import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION guest.check_otp_attempts(TEXT) FROM guest;
    DROP FUNCTION IF EXISTS guest.check_otp_attempts(TEXT);

    DROP FUNCTION IF EXISTS guest.reset_password_with_otp(TEXT, TEXT);

    CREATE OR REPLACE FUNCTION guest.reset_password_with_otp(
      p_email TEXT,
      p_code TEXT,
      p_new_password TEXT
    )
    RETURNS VOID AS $$
    DECLARE
      v_stored RECORD;
    BEGIN
      DELETE FROM otp_codes WHERE expires_at < NOW();

      SELECT code, expires_at, attempts INTO v_stored
      FROM otp_codes
      WHERE email = p_email
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'OTP not found or expired';
      END IF;

      IF v_stored.expires_at < NOW() THEN
        DELETE FROM otp_codes WHERE email = p_email;
        RAISE EXCEPTION 'OTP not found or expired';
      END IF;

      UPDATE otp_codes SET attempts = attempts + 1 WHERE email = p_email;

      IF v_stored.attempts >= 5 THEN
        DELETE FROM otp_codes WHERE email = p_email;
        RAISE EXCEPTION 'Too many failed attempts';
      END IF;

      IF v_stored.code <> p_code THEN
        RAISE EXCEPTION 'Invalid OTP code';
      END IF;

      DELETE FROM otp_codes WHERE email = p_email;
      EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', p_email, p_new_password);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION guest.reset_password_with_otp(TEXT, TEXT, TEXT) TO guest;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION guest.reset_password_with_otp(TEXT, TEXT, TEXT) FROM guest;
    DROP FUNCTION IF EXISTS guest.reset_password_with_otp(TEXT, TEXT, TEXT);

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

    GRANT EXECUTE ON FUNCTION guest.check_otp_attempts(TEXT) TO guest;
    GRANT EXECUTE ON FUNCTION guest.reset_password_with_otp(TEXT, TEXT) TO guest;
  `);
}
