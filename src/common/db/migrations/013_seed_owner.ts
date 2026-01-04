import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    throw new Error('OWNER_EMAIL and OWNER_PASSWORD must be set');
  }

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ownerEmail}') THEN
        EXECUTE format('CREATE USER %I WITH LOGIN PASSWORD %L', '${ownerEmail}', '${ownerPassword}');
      END IF;
    END
    $$;
    
    GRANT owner TO "${ownerEmail}";
    GRANT moderator TO "${ownerEmail}";
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const ownerEmail = process.env.OWNER_EMAIL;

  if (ownerEmail) {
    pgm.sql(`DROP USER IF EXISTS "${ownerEmail}";`);
  }
}
