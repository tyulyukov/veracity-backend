import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Function: Get user growth dynamics
    -- Returns cumulative user count per time period
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

    GRANT EXECUTE ON FUNCTION owner.get_user_growth(DATE, DATE, TEXT) TO owner;

    -- Function: Get connection request activity
    -- Returns sent, accepted, and rejected request counts per time period
    CREATE OR REPLACE FUNCTION owner.get_connection_activity(
      p_start_date DATE,
      p_end_date DATE,
      p_interval TEXT DEFAULT 'day'
    )
    RETURNS TABLE (
      period TIMESTAMPTZ,
      sent_count BIGINT,
      accepted_count BIGINT,
      rejected_count BIGINT
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
      sent_counts AS (
        SELECT
          date_trunc(p_interval, c.created_at) AS period,
          COUNT(*) AS cnt
        FROM connections c
        WHERE c.created_at >= p_start_date
          AND c.created_at < (p_end_date::DATE + INTERVAL '1 day')
        GROUP BY date_trunc(p_interval, c.created_at)
      ),
      accepted_counts AS (
        SELECT
          date_trunc(p_interval, c.updated_at) AS period,
          COUNT(*) AS cnt
        FROM connections c
        WHERE c.status = 'approved'
          AND c.updated_at >= p_start_date
          AND c.updated_at < (p_end_date::DATE + INTERVAL '1 day')
        GROUP BY date_trunc(p_interval, c.updated_at)
      ),
      rejected_counts AS (
        SELECT
          date_trunc(p_interval, c.updated_at) AS period,
          COUNT(*) AS cnt
        FROM connections c
        WHERE c.status = 'ignored'
          AND c.updated_at >= p_start_date
          AND c.updated_at < (p_end_date::DATE + INTERVAL '1 day')
        GROUP BY date_trunc(p_interval, c.updated_at)
      )
      SELECT
        p.period,
        COALESCE(sc.cnt, 0) AS sent_count,
        COALESCE(ac.cnt, 0) AS accepted_count,
        COALESCE(rc.cnt, 0) AS rejected_count
      FROM periods p
      LEFT JOIN sent_counts sc ON p.period = sc.period
      LEFT JOIN accepted_counts ac ON p.period = ac.period
      LEFT JOIN rejected_counts rc ON p.period = rc.period
      ORDER BY p.period;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_connection_activity(DATE, DATE, TEXT) TO owner;

    -- Function: Get content engagement metrics
    -- Returns posts, likes, and comments counts per time period
    CREATE OR REPLACE FUNCTION owner.get_content_engagement(
      p_start_date DATE,
      p_end_date DATE,
      p_interval TEXT DEFAULT 'day'
    )
    RETURNS TABLE (
      period TIMESTAMPTZ,
      posts_count BIGINT,
      likes_count BIGINT,
      comments_count BIGINT
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
      posts_counts AS (
        SELECT
          date_trunc(p_interval, p.created_at) AS period,
          COUNT(*) AS cnt
        FROM posts p
        WHERE p.created_at >= p_start_date
          AND p.created_at < (p_end_date::DATE + INTERVAL '1 day')
          AND p.deleted_at IS NULL
        GROUP BY date_trunc(p_interval, p.created_at)
      ),
      likes_counts AS (
        SELECT
          date_trunc(p_interval, pl.created_at) AS period,
          COUNT(*) AS cnt
        FROM post_likes pl
        WHERE pl.created_at >= p_start_date
          AND pl.created_at < (p_end_date::DATE + INTERVAL '1 day')
        GROUP BY date_trunc(p_interval, pl.created_at)
      ),
      comments_counts AS (
        SELECT
          date_trunc(p_interval, c.created_at) AS period,
          COUNT(*) AS cnt
        FROM comments c
        WHERE c.created_at >= p_start_date
          AND c.created_at < (p_end_date::DATE + INTERVAL '1 day')
          AND c.deleted_at IS NULL
        GROUP BY date_trunc(p_interval, c.created_at)
      )
      SELECT
        p.period,
        COALESCE(pc.cnt, 0) AS posts_count,
        COALESCE(lc.cnt, 0) AS likes_count,
        COALESCE(cc.cnt, 0) AS comments_count
      FROM periods p
      LEFT JOIN posts_counts pc ON p.period = pc.period
      LEFT JOIN likes_counts lc ON p.period = lc.period
      LEFT JOIN comments_counts cc ON p.period = cc.period
      ORDER BY p.period;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_content_engagement(DATE, DATE, TEXT) TO owner;

    -- Function: Get event interest by month for a year
    -- Returns registrations and events counts per month
    CREATE OR REPLACE FUNCTION owner.get_event_interest(
      p_year INT
    )
    RETURNS TABLE (
      month INT,
      registrations_count BIGINT,
      events_count BIGINT
    ) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can access analytics';
      END IF;

      RETURN QUERY
      WITH months AS (
        SELECT generate_series(1, 12) AS month
      ),
      registrations_by_month AS (
        SELECT
          EXTRACT(MONTH FROM er.created_at)::INT AS month,
          COUNT(*) AS cnt
        FROM event_registrations er
        JOIN events e ON e.id = er.event_id
        WHERE EXTRACT(YEAR FROM e.event_date) = p_year
        GROUP BY EXTRACT(MONTH FROM er.created_at)::INT
      ),
      events_by_month AS (
        SELECT
          EXTRACT(MONTH FROM e.event_date)::INT AS month,
          COUNT(*) AS cnt
        FROM events e
        WHERE EXTRACT(YEAR FROM e.event_date) = p_year
        GROUP BY EXTRACT(MONTH FROM e.event_date)::INT
      )
      SELECT
        m.month,
        COALESCE(r.cnt, 0) AS registrations_count,
        COALESCE(ev.cnt, 0) AS events_count
      FROM months m
      LEFT JOIN registrations_by_month r ON m.month = r.month
      LEFT JOIN events_by_month ev ON m.month = ev.month
      ORDER BY m.month;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_event_interest(INT) TO owner;

    -- Function: Get top interests by user count
    CREATE OR REPLACE FUNCTION owner.get_top_interests(
      p_limit INT DEFAULT 10
    )
    RETURNS TABLE (
      interest_id UUID,
      interest_name VARCHAR(100),
      user_count BIGINT
    ) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can access analytics';
      END IF;

      RETURN QUERY
      SELECT
        i.id AS interest_id,
        i.name AS interest_name,
        COUNT(ui.user_id) AS user_count
      FROM interests i
      LEFT JOIN user_interests ui ON ui.interest_id = i.id
      LEFT JOIN users u ON u.id = ui.user_id AND u.status = 'active'
      GROUP BY i.id, i.name
      ORDER BY user_count DESC, i.name
      LIMIT p_limit;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_top_interests(INT) TO owner;

    -- Function: Get user retention metrics
    -- Returns active users, total users, and retention rate per time period
    CREATE OR REPLACE FUNCTION owner.get_user_retention(
      p_start_date DATE,
      p_end_date DATE,
      p_interval TEXT DEFAULT 'day'
    )
    RETURNS TABLE (
      period TIMESTAMPTZ,
      active_users BIGINT,
      total_users BIGINT,
      retention_rate NUMERIC
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
      active_users_per_period AS (
        SELECT
          date_trunc(p_interval, u.last_activity_at) AS period,
          COUNT(DISTINCT u.id) AS active_cnt
        FROM users u
        WHERE u.last_activity_at >= p_start_date
          AND u.last_activity_at < (p_end_date::DATE + INTERVAL '1 day')
          AND u.status = 'active'
        GROUP BY date_trunc(p_interval, u.last_activity_at)
      ),
      total_users_per_period AS (
        SELECT
          p.period,
          COUNT(*) AS total_cnt
        FROM periods p
        CROSS JOIN LATERAL (
          SELECT 1 FROM users u
          WHERE u.created_at <= (p.period + ('1 ' || p_interval)::INTERVAL)
        ) AS u
        GROUP BY p.period
      )
      SELECT
        p.period,
        COALESCE(au.active_cnt, 0) AS active_users,
        COALESCE(tu.total_cnt, 0) AS total_users,
        CASE
          WHEN COALESCE(tu.total_cnt, 0) = 0 THEN 0
          ELSE ROUND((COALESCE(au.active_cnt, 0)::NUMERIC / tu.total_cnt::NUMERIC) * 100, 2)
        END AS retention_rate
      FROM periods p
      LEFT JOIN active_users_per_period au ON p.period = au.period
      LEFT JOIN total_users_per_period tu ON p.period = tu.period
      ORDER BY p.period;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_user_retention(DATE, DATE, TEXT) TO owner;

    -- Function: Get platform overview with key metrics
    CREATE OR REPLACE FUNCTION owner.get_platform_overview()
    RETURNS TABLE (
      total_users BIGINT,
      active_users BIGINT,
      pending_users BIGINT,
      total_connections BIGINT,
      pending_connections BIGINT,
      avg_connections_per_user NUMERIC,
      total_posts BIGINT,
      total_likes BIGINT,
      total_comments BIGINT,
      total_events BIGINT,
      total_event_registrations BIGINT,
      total_speakers BIGINT
    ) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can access analytics';
      END IF;

      RETURN QUERY
      SELECT
        (SELECT COUNT(*) FROM users)::BIGINT AS total_users,
        (SELECT COUNT(*) FROM users WHERE status = 'active')::BIGINT AS active_users,
        (SELECT COUNT(*) FROM users WHERE status = 'pending')::BIGINT AS pending_users,
        (SELECT COUNT(*) FROM connections WHERE status = 'approved')::BIGINT AS total_connections,
        (SELECT COUNT(*) FROM connections WHERE status = 'pending')::BIGINT AS pending_connections,
        COALESCE(
          ROUND(
            (SELECT COUNT(*) FROM connections WHERE status = 'approved')::NUMERIC /
            NULLIF((SELECT COUNT(*) FROM users WHERE status = 'active'), 0),
            2
          ),
          0
        ) AS avg_connections_per_user,
        (SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL)::BIGINT AS total_posts,
        (SELECT COUNT(*) FROM post_likes)::BIGINT AS total_likes,
        (SELECT COUNT(*) FROM comments WHERE deleted_at IS NULL)::BIGINT AS total_comments,
        (SELECT COUNT(*) FROM events)::BIGINT AS total_events,
        (SELECT COUNT(*) FROM event_registrations)::BIGINT AS total_event_registrations,
        (SELECT COUNT(*) FROM users WHERE role = 'speaker' AND status = 'active')::BIGINT AS total_speakers;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_platform_overview() TO owner;

    -- Function: Get speaker analytics
    -- Returns speaker engagement metrics sorted by total registrations
    CREATE OR REPLACE FUNCTION owner.get_speaker_analytics(
      p_limit INT DEFAULT 10
    )
    RETURNS TABLE (
      speaker_id UUID,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      events_count BIGINT,
      total_registrations BIGINT,
      avg_registrations_per_event NUMERIC
    ) AS $$
    BEGIN
      IF NOT pg_has_role(session_user, 'owner', 'MEMBER') THEN
        RAISE EXCEPTION 'Only owner can access analytics';
      END IF;

      RETURN QUERY
      SELECT
        u.id AS speaker_id,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT e.id) AS events_count,
        COUNT(er.user_id) AS total_registrations,
        COALESCE(
          ROUND(COUNT(er.user_id)::NUMERIC / NULLIF(COUNT(DISTINCT e.id), 0), 2),
          0
        ) AS avg_registrations_per_event
      FROM users u
      JOIN events e ON e.speaker_id = u.id
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE u.role = 'speaker' AND u.status = 'active'
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_registrations DESC, events_count DESC
      LIMIT p_limit;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION owner.get_speaker_analytics(INT) TO owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE EXECUTE ON FUNCTION owner.get_speaker_analytics(INT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_speaker_analytics(INT);

    REVOKE EXECUTE ON FUNCTION owner.get_platform_overview() FROM owner;
    DROP FUNCTION IF EXISTS owner.get_platform_overview();

    REVOKE EXECUTE ON FUNCTION owner.get_user_retention(DATE, DATE, TEXT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_user_retention(DATE, DATE, TEXT);

    REVOKE EXECUTE ON FUNCTION owner.get_top_interests(INT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_top_interests(INT);

    REVOKE EXECUTE ON FUNCTION owner.get_event_interest(INT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_event_interest(INT);

    REVOKE EXECUTE ON FUNCTION owner.get_content_engagement(DATE, DATE, TEXT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_content_engagement(DATE, DATE, TEXT);

    REVOKE EXECUTE ON FUNCTION owner.get_connection_activity(DATE, DATE, TEXT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_connection_activity(DATE, DATE, TEXT);

    REVOKE EXECUTE ON FUNCTION owner.get_user_growth(DATE, DATE, TEXT) FROM owner;
    DROP FUNCTION IF EXISTS owner.get_user_growth(DATE, DATE, TEXT);
  `);
}
