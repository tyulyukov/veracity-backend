import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive');
    CREATE TYPE user_role AS ENUM ('standard_user', 'speaker');
    CREATE TYPE connection_status AS ENUM ('pending', 'approved', 'ignored');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TYPE IF EXISTS connection_status;
    DROP TYPE IF EXISTS user_role;
    DROP TYPE IF EXISTS user_status;
  `);
}

