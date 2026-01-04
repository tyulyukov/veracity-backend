import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE ALL ON SCHEMA public FROM PUBLIC;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO guest, standard_user, speaker, moderator, owner;

    CREATE SCHEMA IF NOT EXISTS general;
    CREATE SCHEMA IF NOT EXISTS guest;
    CREATE SCHEMA IF NOT EXISTS "user";
    CREATE SCHEMA IF NOT EXISTS speaker;
    CREATE SCHEMA IF NOT EXISTS admin;
    CREATE SCHEMA IF NOT EXISTS owner;

    GRANT USAGE ON SCHEMA general TO guest, standard_user, speaker, moderator, owner;
    GRANT USAGE ON SCHEMA guest TO guest;
    GRANT USAGE ON SCHEMA "user" TO standard_user, speaker;
    GRANT USAGE ON SCHEMA speaker TO speaker;
    GRANT USAGE ON SCHEMA admin TO moderator, owner;
    GRANT USAGE ON SCHEMA owner TO owner;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE USAGE ON SCHEMA owner FROM owner;
    REVOKE USAGE ON SCHEMA admin FROM moderator, owner;
    REVOKE USAGE ON SCHEMA speaker FROM speaker;
    REVOKE USAGE ON SCHEMA "user" FROM standard_user, speaker;
    REVOKE USAGE ON SCHEMA guest FROM guest;
    REVOKE USAGE ON SCHEMA general FROM guest, standard_user, speaker, moderator, owner;

    DROP SCHEMA IF EXISTS owner;
    DROP SCHEMA IF EXISTS admin;
    DROP SCHEMA IF EXISTS speaker;
    DROP SCHEMA IF EXISTS "user";
    DROP SCHEMA IF EXISTS guest;
    DROP SCHEMA IF EXISTS general;

    GRANT USAGE ON SCHEMA public TO PUBLIC;
  `);
}
