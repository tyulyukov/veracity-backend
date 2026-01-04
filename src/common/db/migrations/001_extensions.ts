import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP EXTENSION IF EXISTS "uuid-ossp";`);
}

