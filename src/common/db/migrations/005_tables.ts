import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL UNIQUE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      avatar_url TEXT,
      position VARCHAR(255),
      contact_info JSONB,
      short_description TEXT,
      status user_status NOT NULL DEFAULT 'pending',
      role user_role NOT NULL DEFAULT 'standard_user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ
    );

    CREATE TABLE otp_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE interests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL UNIQUE
    );

    CREATE TABLE user_interests (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      interest_id UUID NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, interest_id)
    );

    CREATE TABLE connections (
      requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status connection_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (requester_user_id, target_user_id)
    );

    CREATE TABLE posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT,
      image_urls TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE post_likes (
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      speaker_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      is_online BOOL NOT NULL,
      event_date TIMESTAMPTZ NOT NULL,
      location VARCHAR(255),
      link TEXT,
      description TEXT,
      image_urls TEXT[],
      tags TEXT[],
      limit_participants INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE event_registrations (
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (event_id, user_id)
    );

    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE IF EXISTS event_registrations;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS post_likes;
    DROP TABLE IF EXISTS posts;
    DROP TABLE IF EXISTS connections;
    DROP TABLE IF EXISTS user_interests;
    DROP TABLE IF EXISTS interests;
    DROP TABLE IF EXISTS otp_codes;
    DROP TABLE IF EXISTS users;
  `);
}
