import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE ROLE guest LOGIN PASSWORD 'guest';

    CREATE ROLE standard_user NOLOGIN;
    CREATE ROLE speaker NOLOGIN;
    CREATE ROLE moderator NOLOGIN;
    CREATE ROLE owner NOLOGIN;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP ROLE IF EXISTS owner;
    DROP ROLE IF EXISTS moderator;
    DROP ROLE IF EXISTS speaker;
    DROP ROLE IF EXISTS standard_user;
    DROP ROLE IF EXISTS guest;
  `);
}

