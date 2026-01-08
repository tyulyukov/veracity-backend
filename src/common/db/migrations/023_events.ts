import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Enable RLS on events and event_registrations tables
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for events table
    -- Anyone (standard_user, speaker) can view events
    CREATE POLICY events_select_user ON events FOR SELECT TO standard_user, speaker
      USING (true);

    -- Admins can view all events
    CREATE POLICY events_select_admin ON events FOR SELECT TO moderator, owner
      USING (true);

    -- Only speakers can insert events (and only their own)
    CREATE POLICY events_insert_speaker ON events FOR INSERT TO speaker
      WITH CHECK (
        speaker_id IN (SELECT id FROM users WHERE email = session_user)
      );

    -- Speakers can update only their own events
    CREATE POLICY events_update_speaker ON events FOR UPDATE TO speaker
      USING (
        speaker_id IN (SELECT id FROM users WHERE email = session_user)
      );

    -- Speakers can delete only their own events
    CREATE POLICY events_delete_speaker ON events FOR DELETE TO speaker
      USING (
        speaker_id IN (SELECT id FROM users WHERE email = session_user)
      );

    GRANT SELECT ON events TO standard_user, speaker, moderator, owner;
    GRANT INSERT, UPDATE, DELETE ON events TO speaker;

    -- RLS Policies for event_registrations table
    -- Users can view their own registrations
    CREATE POLICY event_registrations_select_own ON event_registrations FOR SELECT TO standard_user, speaker
      USING (
        user_id IN (SELECT id FROM users WHERE email = session_user)
      );

    -- Speakers can view registrations for their events
    CREATE POLICY event_registrations_select_speaker ON event_registrations FOR SELECT TO speaker
      USING (
        event_id IN (SELECT id FROM events WHERE speaker_id IN (SELECT id FROM users WHERE email = session_user))
      );

    -- Admins can view all registrations
    CREATE POLICY event_registrations_select_admin ON event_registrations FOR SELECT TO moderator, owner
      USING (true);

    -- Users can insert their own registrations
    CREATE POLICY event_registrations_insert_user ON event_registrations FOR INSERT TO standard_user, speaker
      WITH CHECK (
        user_id IN (SELECT id FROM users WHERE email = session_user)
      );

    -- Users can delete their own registrations
    CREATE POLICY event_registrations_delete_user ON event_registrations FOR DELETE TO standard_user, speaker
      USING (
        user_id IN (SELECT id FROM users WHERE email = session_user)
      );

    GRANT SELECT ON event_registrations TO standard_user, speaker, moderator, owner;
    GRANT INSERT, DELETE ON event_registrations TO standard_user, speaker;

    -- View for users to see all events with registration status
    CREATE VIEW "user".events_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    ),
    event_participant_counts AS (
      SELECT
        event_id,
        COUNT(*)::int AS participant_count
      FROM event_registrations
      GROUP BY event_id
    )
    SELECT
      e.id,
      e.name,
      e.is_online,
      e.event_date,
      e.location,
      e.link,
      e.description,
      e.image_urls,
      e.tags,
      e.limit_participants,
      COALESCE(epc.participant_count, 0) AS participant_count,
      e.created_at,
      speaker.id AS speaker_id,
      speaker.first_name AS speaker_first_name,
      speaker.last_name AS speaker_last_name,
      speaker.avatar_url AS speaker_avatar_url,
      speaker.role AS speaker_role,
      EXISTS (
        SELECT 1 FROM event_registrations er
        WHERE er.event_id = e.id AND er.user_id = cu.id
      ) AS is_registered
    FROM events e
    CROSS JOIN current_user_id cu
    LEFT JOIN users speaker ON e.speaker_id = speaker.id
    LEFT JOIN event_participant_counts epc ON e.id = epc.event_id
    WHERE speaker.status = 'active';

    GRANT SELECT ON "user".events_v TO standard_user, speaker;

    -- View for speakers to see their own events
    CREATE VIEW speaker.my_events_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    ),
    event_participant_counts AS (
      SELECT
        event_id,
        COUNT(*)::int AS participant_count
      FROM event_registrations
      GROUP BY event_id
    )
    SELECT
      e.id,
      e.name,
      e.is_online,
      e.event_date,
      e.location,
      e.link,
      e.description,
      e.image_urls,
      e.tags,
      e.limit_participants,
      COALESCE(epc.participant_count, 0) AS participant_count,
      e.created_at
    FROM events e
    CROSS JOIN current_user_id cu
    LEFT JOIN event_participant_counts epc ON e.id = epc.event_id
    WHERE e.speaker_id = cu.id;

    GRANT SELECT ON speaker.my_events_v TO speaker;

    -- View for admins to see all events with full details
    CREATE VIEW admin.events_v AS
    WITH event_participant_counts AS (
      SELECT
        event_id,
        COUNT(*)::int AS participant_count
      FROM event_registrations
      GROUP BY event_id
    )
    SELECT
      e.id,
      e.name,
      e.is_online,
      e.event_date,
      e.location,
      e.link,
      e.description,
      e.image_urls,
      e.tags,
      e.limit_participants,
      COALESCE(epc.participant_count, 0) AS participant_count,
      e.created_at,
      speaker.id AS speaker_id,
      speaker.first_name AS speaker_first_name,
      speaker.last_name AS speaker_last_name,
      speaker.avatar_url AS speaker_avatar_url,
      speaker.role AS speaker_role
    FROM events e
    LEFT JOIN users speaker ON e.speaker_id = speaker.id
    LEFT JOIN event_participant_counts epc ON e.id = epc.event_id;

    GRANT SELECT ON admin.events_v TO moderator, owner;

    -- Function for speaker to create an event
    CREATE OR REPLACE FUNCTION speaker.create_event(
      p_name VARCHAR(255),
      p_is_online BOOL,
      p_event_date TIMESTAMPTZ,
      p_location VARCHAR(255),
      p_link TEXT,
      p_description TEXT,
      p_image_urls TEXT[],
      p_tags TEXT[],
      p_limit_participants INTEGER
    )
    RETURNS TABLE (
      id UUID,
      speaker_id UUID,
      name VARCHAR(255),
      is_online BOOL,
      event_date TIMESTAMPTZ,
      location VARCHAR(255),
      link TEXT,
      description TEXT,
      image_urls TEXT[],
      tags TEXT[],
      limit_participants INTEGER,
      created_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_speaker_id UUID;
      v_speaker_status user_status;
      v_speaker_role user_role;
    BEGIN
      IF NOT pg_has_role(session_user, 'speaker', 'MEMBER') THEN
        RAISE EXCEPTION 'Access denied: Only speakers can create events';
      END IF;

      SELECT u.id, u.status, u.role INTO v_speaker_id, v_speaker_status, v_speaker_role
      FROM users u WHERE u.email = session_user;

      IF v_speaker_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_speaker_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      IF v_speaker_role != 'speaker' THEN
        RAISE EXCEPTION 'Only speakers can create events';
      END IF;

      IF p_limit_participants IS NOT NULL AND p_limit_participants < 1 THEN
        RAISE EXCEPTION 'Participant limit must be at least 1';
      END IF;

      INSERT INTO events (
        speaker_id, name, is_online, event_date, location, link,
        description, image_urls, tags, limit_participants, created_at
      )
      VALUES (
        v_speaker_id, p_name, p_is_online, p_event_date, p_location, p_link,
        p_description, p_image_urls, p_tags, p_limit_participants, NOW()
      )
      RETURNING * INTO id, speaker_id, name, is_online, event_date, location, link,
                       description, image_urls, tags, limit_participants, created_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION speaker.create_event(
      VARCHAR(255), BOOL, TIMESTAMPTZ, VARCHAR(255), TEXT, TEXT, TEXT[], TEXT[], INTEGER
    ) TO speaker;

    -- Function for speaker to update an event
    CREATE OR REPLACE FUNCTION speaker.update_event(
      p_event_id UUID,
      p_name VARCHAR(255),
      p_is_online BOOL,
      p_event_date TIMESTAMPTZ,
      p_location VARCHAR(255),
      p_link TEXT,
      p_description TEXT,
      p_image_urls TEXT[],
      p_tags TEXT[],
      p_limit_participants INTEGER
    )
    RETURNS TABLE (
      id UUID,
      speaker_id UUID,
      name VARCHAR(255),
      is_online BOOL,
      event_date TIMESTAMPTZ,
      location VARCHAR(255),
      link TEXT,
      description TEXT,
      image_urls TEXT[],
      tags TEXT[],
      limit_participants INTEGER,
      created_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_speaker_id UUID;
      v_speaker_status user_status;
      v_event_speaker_id UUID;
      v_current_participants INTEGER;
    BEGIN
      IF NOT pg_has_role(session_user, 'speaker', 'MEMBER') THEN
        RAISE EXCEPTION 'Access denied: Only speakers can update events';
      END IF;

      SELECT u.id, u.status INTO v_speaker_id, v_speaker_status
      FROM users u WHERE u.email = session_user;

      IF v_speaker_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_speaker_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT e.speaker_id INTO v_event_speaker_id FROM events e WHERE e.id = p_event_id FOR UPDATE;

      IF v_event_speaker_id IS NULL THEN
        RAISE EXCEPTION 'Event not found';
      END IF;

      IF v_event_speaker_id != v_speaker_id THEN
        RAISE EXCEPTION 'You can only update your own events';
      END IF;

      -- Check if new limit is less than current participants
      IF p_limit_participants IS NOT NULL THEN
        IF p_limit_participants < 1 THEN
          RAISE EXCEPTION 'Participant limit must be at least 1';
        END IF;

        SELECT COUNT(*) INTO v_current_participants
        FROM event_registrations er WHERE er.event_id = p_event_id;

        IF p_limit_participants < v_current_participants THEN
          RAISE EXCEPTION 'Cannot set limit below current participant count';
        END IF;
      END IF;

      UPDATE events e SET
        name = p_name,
        is_online = p_is_online,
        event_date = p_event_date,
        location = p_location,
        link = p_link,
        description = p_description,
        image_urls = p_image_urls,
        tags = p_tags,
        limit_participants = p_limit_participants
      WHERE e.id = p_event_id
      RETURNING * INTO id, speaker_id, name, is_online, event_date, location, link,
                       description, image_urls, tags, limit_participants, created_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION speaker.update_event(
      UUID, VARCHAR(255), BOOL, TIMESTAMPTZ, VARCHAR(255), TEXT, TEXT, TEXT[], TEXT[], INTEGER
    ) TO speaker;

    -- Function for speaker to delete an event
    CREATE OR REPLACE FUNCTION speaker.delete_event(p_event_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_speaker_id UUID;
      v_speaker_status user_status;
      v_event_speaker_id UUID;
    BEGIN
      IF NOT pg_has_role(session_user, 'speaker', 'MEMBER') THEN
        RAISE EXCEPTION 'Access denied: Only speakers can delete events';
      END IF;

      SELECT u.id, u.status INTO v_speaker_id, v_speaker_status
      FROM users u WHERE u.email = session_user;

      IF v_speaker_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_speaker_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT e.speaker_id INTO v_event_speaker_id FROM events e WHERE e.id = p_event_id FOR UPDATE;

      IF v_event_speaker_id IS NULL THEN
        RAISE EXCEPTION 'Event not found';
      END IF;

      IF v_event_speaker_id != v_speaker_id THEN
        RAISE EXCEPTION 'You can only delete your own events';
      END IF;

      DELETE FROM events e WHERE e.id = p_event_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION speaker.delete_event(UUID) TO speaker;

    -- Function for user to register for an event
    CREATE OR REPLACE FUNCTION "user".register_for_event(
      p_event_id UUID,
      p_comment TEXT
    )
    RETURNS TABLE (
      event_id UUID,
      user_id UUID,
      comment TEXT,
      created_at TIMESTAMPTZ
    ) AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_event_exists BOOLEAN;
      v_limit_participants INTEGER;
      v_current_participants INTEGER;
      v_speaker_id UUID;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status
      FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT e.speaker_id, e.limit_participants INTO v_speaker_id, v_limit_participants
      FROM events e WHERE e.id = p_event_id;

      IF v_speaker_id IS NULL THEN
        RAISE EXCEPTION 'Event not found';
      END IF;

      -- Check if user is trying to register for their own event
      IF v_speaker_id = v_user_id THEN
        RAISE EXCEPTION 'Cannot register for your own event';
      END IF;

      -- Check if already registered
      IF EXISTS (SELECT 1 FROM event_registrations er WHERE er.event_id = p_event_id AND er.user_id = v_user_id) THEN
        RAISE EXCEPTION 'Already registered for this event';
      END IF;

      -- Check participant limit
      IF v_limit_participants IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_participants
        FROM event_registrations er WHERE er.event_id = p_event_id;

        IF v_current_participants >= v_limit_participants THEN
          RAISE EXCEPTION 'Event is full';
        END IF;
      END IF;

      INSERT INTO event_registrations (event_id, user_id, comment, created_at)
      VALUES (p_event_id, v_user_id, p_comment, NOW())
      RETURNING * INTO event_id, user_id, comment, created_at;

      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".register_for_event(UUID, TEXT) TO standard_user, speaker;

    -- Function for user to unregister from an event
    CREATE OR REPLACE FUNCTION "user".unregister_from_event(p_event_id UUID)
    RETURNS VOID AS $$
    DECLARE
      v_user_id UUID;
      v_user_status user_status;
      v_registration_exists BOOLEAN;
    BEGIN
      IF NOT (pg_has_role(session_user, 'standard_user', 'MEMBER') OR pg_has_role(session_user, 'speaker', 'MEMBER')) THEN
        RAISE EXCEPTION 'Access denied';
      END IF;

      SELECT u.id, u.status INTO v_user_id, v_user_status
      FROM users u WHERE u.email = session_user;

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;

      IF v_user_status != 'active' THEN
        RAISE EXCEPTION 'User is not active';
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM event_registrations er
        WHERE er.event_id = p_event_id AND er.user_id = v_user_id
      ) INTO v_registration_exists;

      IF NOT v_registration_exists THEN
        RAISE EXCEPTION 'Registration not found';
      END IF;

      DELETE FROM event_registrations er
      WHERE er.event_id = p_event_id AND er.user_id = v_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION "user".unregister_from_event(UUID) TO standard_user, speaker;

    -- View for speaker to see participants of their events
    CREATE VIEW speaker.event_participants_v AS
    WITH current_user_id AS (
      SELECT general.get_current_user_id() AS id
    )
    SELECT
      er.event_id,
      er.comment,
      er.created_at AS registration_created_at,
      u.id,
      u.first_name,
      u.last_name,
      u.avatar_url,
      u.role
    FROM event_registrations er
    CROSS JOIN current_user_id cu
    JOIN events e ON er.event_id = e.id
    JOIN users u ON er.user_id = u.id
    WHERE e.speaker_id = cu.id;

    GRANT SELECT ON speaker.event_participants_v TO speaker;

    -- View for admin to see user's created events and registrations
    CREATE VIEW admin.user_events_and_registrations_v AS
    WITH event_participant_counts AS (
      SELECT
        event_id,
        COUNT(*)::int AS participant_count
      FROM event_registrations
      GROUP BY event_id
    )
    SELECT
      u.id AS user_id,
      'created' AS event_relation_type,
      e.id AS event_id,
      e.name,
      e.is_online,
      e.event_date,
      e.location,
      e.link,
      e.description,
      e.image_urls,
      e.tags,
      e.limit_participants,
      COALESCE(epc.participant_count, 0) AS participant_count,
      e.created_at,
      NULL::TEXT AS registration_comment,
      NULL::TIMESTAMPTZ AS registration_created_at
    FROM users u
    JOIN events e ON e.speaker_id = u.id
    LEFT JOIN event_participant_counts epc ON e.id = epc.event_id
    UNION ALL
    SELECT
      u.id AS user_id,
      'registered' AS event_relation_type,
      e.id AS event_id,
      e.name,
      e.is_online,
      e.event_date,
      e.location,
      e.link,
      e.description,
      e.image_urls,
      e.tags,
      e.limit_participants,
      COALESCE(epc.participant_count, 0) AS participant_count,
      e.created_at,
      er.comment AS registration_comment,
      er.created_at AS registration_created_at
    FROM users u
    JOIN event_registrations er ON er.user_id = u.id
    JOIN events e ON er.event_id = e.id
    LEFT JOIN event_participant_counts epc ON e.id = epc.event_id;

    GRANT SELECT ON admin.user_events_and_registrations_v TO moderator, owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    -- Drop admin views
    REVOKE SELECT ON admin.user_events_and_registrations_v FROM moderator, owner;
    DROP VIEW IF EXISTS admin.user_events_and_registrations_v;

    REVOKE SELECT ON admin.events_v FROM moderator, owner;
    DROP VIEW IF EXISTS admin.events_v;

    -- Drop speaker views
    REVOKE SELECT ON speaker.event_participants_v FROM speaker;
    DROP VIEW IF EXISTS speaker.event_participants_v;

    REVOKE SELECT ON speaker.my_events_v FROM speaker;
    DROP VIEW IF EXISTS speaker.my_events_v;

    -- Drop user views
    REVOKE SELECT ON "user".events_v FROM standard_user, speaker;
    DROP VIEW IF EXISTS "user".events_v;

    -- Drop user functions
    REVOKE EXECUTE ON FUNCTION "user".unregister_from_event(UUID) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".unregister_from_event(UUID);

    REVOKE EXECUTE ON FUNCTION "user".register_for_event(UUID, TEXT) FROM standard_user, speaker;
    DROP FUNCTION IF EXISTS "user".register_for_event(UUID, TEXT);

    -- Drop speaker functions
    REVOKE EXECUTE ON FUNCTION speaker.delete_event(UUID) FROM speaker;
    DROP FUNCTION IF EXISTS speaker.delete_event(UUID);

    REVOKE EXECUTE ON FUNCTION speaker.update_event(
      UUID, VARCHAR(255), BOOL, TIMESTAMPTZ, VARCHAR(255), TEXT, TEXT, TEXT[], TEXT[], INTEGER
    ) FROM speaker;
    DROP FUNCTION IF EXISTS speaker.update_event(
      UUID, VARCHAR(255), BOOL, TIMESTAMPTZ, VARCHAR(255), TEXT, TEXT, TEXT[], TEXT[], INTEGER
    );

    REVOKE EXECUTE ON FUNCTION speaker.create_event(
      VARCHAR(255), BOOL, TIMESTAMPTZ, VARCHAR(255), TEXT, TEXT, TEXT[], TEXT[], INTEGER
    ) FROM speaker;
    DROP FUNCTION IF EXISTS speaker.create_event(
      VARCHAR(255), BOOL, TIMESTAMPTZ, VARCHAR(255), TEXT, TEXT, TEXT[], TEXT[], INTEGER
    );

    -- Drop grants and policies for event_registrations
    REVOKE INSERT, DELETE ON event_registrations FROM standard_user, speaker;
    REVOKE SELECT ON event_registrations FROM standard_user, speaker, moderator, owner;

    DROP POLICY IF EXISTS event_registrations_delete_user ON event_registrations;
    DROP POLICY IF EXISTS event_registrations_insert_user ON event_registrations;
    DROP POLICY IF EXISTS event_registrations_select_admin ON event_registrations;
    DROP POLICY IF EXISTS event_registrations_select_speaker ON event_registrations;
    DROP POLICY IF EXISTS event_registrations_select_own ON event_registrations;

    ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

    -- Drop grants and policies for events
    REVOKE INSERT, UPDATE, DELETE ON events FROM speaker;
    REVOKE SELECT ON events FROM standard_user, speaker, moderator, owner;

    DROP POLICY IF EXISTS events_delete_speaker ON events;
    DROP POLICY IF EXISTS events_update_speaker ON events;
    DROP POLICY IF EXISTS events_insert_speaker ON events;
    DROP POLICY IF EXISTS events_select_admin ON events;
    DROP POLICY IF EXISTS events_select_user ON events;

    ALTER TABLE events DISABLE ROW LEVEL SECURITY;
  `);
}
