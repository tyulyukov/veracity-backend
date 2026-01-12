import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION owner.get_user_growth(
      p_start_date DATE,
      p_end_date DATE,
      p_interval TEXT DEFAULT 'day'
    )
    RETURNS TABLE (
      period TIMESTAMPTZ,
      user_count BIGINT
    ) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can access analytics';
      END IF;

      RETURN QUERY
      WITH periods AS (
        SELECT generate_series(
          date_trunc(p_interval, p_start_date::TIMESTAMPTZ),
          date_trunc(p_interval, p_end_date::TIMESTAMPTZ),
          ('1 ' || p_interval)::INTERVAL
        ) AS period
      ),
      user_counts AS (
        SELECT
          date_trunc(p_interval, u.created_at) AS period,
          COUNT(*)::BIGINT AS new_users
        FROM users u
        WHERE u.created_at >= p_start_date
          AND u.created_at < (p_end_date::DATE + INTERVAL '1 day')
        GROUP BY date_trunc(p_interval, u.created_at)
      )
      SELECT
        p.period,
        (COALESCE(SUM(uc.new_users) OVER (ORDER BY p.period), 0) +
          (SELECT COUNT(*) FROM users WHERE created_at < p_start_date))::BIGINT AS user_count
      FROM periods p
      LEFT JOIN user_counts uc ON p.period = uc.period
      ORDER BY p.period;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION owner.get_user_growth(
      p_start_date DATE,
      p_end_date DATE,
      p_interval TEXT DEFAULT 'day'
    )
    RETURNS TABLE (
      period TIMESTAMPTZ,
      user_count BIGINT
    ) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can access analytics';
      END IF;

      RETURN QUERY
      WITH periods AS (
        SELECT generate_series(
          date_trunc(p_interval, p_start_date::TIMESTAMPTZ),
          date_trunc(p_interval, p_end_date::TIMESTAMPTZ),
          ('1 ' || p_interval)::INTERVAL
        ) AS period
      ),
      user_counts AS (
        SELECT
          date_trunc(p_interval, u.created_at) AS period,
          COUNT(*) AS new_users
        FROM users u
        WHERE u.created_at >= p_start_date
          AND u.created_at < (p_end_date::DATE + INTERVAL '1 day')
        GROUP BY date_trunc(p_interval, u.created_at)
      )
      SELECT
        p.period,
        COALESCE(
          SUM(uc.new_users) OVER (ORDER BY p.period),
          0
        ) + (
          SELECT COUNT(*) FROM users WHERE created_at < p_start_date
        ) AS user_count
      FROM periods p
      LEFT JOIN user_counts uc ON p.period = uc.period
      ORDER BY p.period;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  `);
}
