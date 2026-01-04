import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE INDEX idx_users_status ON users(status);
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_created_at_id ON users(created_at, id);

    CREATE INDEX idx_otp_codes_email ON otp_codes(email);
    CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);

    CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
    CREATE INDEX idx_user_interests_interest_id ON user_interests(interest_id);

    CREATE INDEX idx_connections_requester ON connections(requester_user_id);
    CREATE INDEX idx_connections_target ON connections(target_user_id);
    CREATE INDEX idx_connections_status ON connections(status);

    CREATE INDEX idx_posts_author_id ON posts(author_id);
    CREATE INDEX idx_posts_created_at ON posts(created_at);

    CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
    CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);

    CREATE INDEX idx_comments_post_id ON comments(post_id);
    CREATE INDEX idx_comments_user_id ON comments(user_id);

    CREATE INDEX idx_events_speaker_id ON events(speaker_id);
    CREATE INDEX idx_events_event_date ON events(event_date);

    CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);
    CREATE INDEX idx_event_registrations_user_id ON event_registrations(user_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_event_registrations_user_id;
    DROP INDEX IF EXISTS idx_event_registrations_event_id;
    DROP INDEX IF EXISTS idx_events_event_date;
    DROP INDEX IF EXISTS idx_events_speaker_id;
    DROP INDEX IF EXISTS idx_comments_user_id;
    DROP INDEX IF EXISTS idx_comments_post_id;
    DROP INDEX IF EXISTS idx_post_likes_user_id;
    DROP INDEX IF EXISTS idx_post_likes_post_id;
    DROP INDEX IF EXISTS idx_posts_created_at;
    DROP INDEX IF EXISTS idx_posts_author_id;
    DROP INDEX IF EXISTS idx_connections_status;
    DROP INDEX IF EXISTS idx_connections_target;
    DROP INDEX IF EXISTS idx_connections_requester;
    DROP INDEX IF EXISTS idx_user_interests_interest_id;
    DROP INDEX IF EXISTS idx_user_interests_user_id;
    DROP INDEX IF EXISTS idx_otp_codes_expires_at;
    DROP INDEX IF EXISTS idx_otp_codes_email;
    DROP INDEX IF EXISTS idx_users_created_at_id;
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_users_status;
  `);
}

