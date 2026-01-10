import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE UNIQUE INDEX connections_bidirectional_unique_idx
    ON connections (
      LEAST(requester_user_id, target_user_id),
      GREATEST(requester_user_id, target_user_id)
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS connections_bidirectional_unique_idx;
  `);
}
