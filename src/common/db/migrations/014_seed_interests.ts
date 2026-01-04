import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    INSERT INTO interests (name) VALUES
      ('AI'),
      ('Design'),
      ('Productivity'),
      ('Startups'),
      ('Networking'),
      ('Marketing'),
      ('Finance'),
      ('Technology'),
      ('Leadership'),
      ('Innovation');
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM interests WHERE name IN (
      'AI', 'Design', 'Productivity', 'Startups', 'Networking',
      'Marketing', 'Finance', 'Technology', 'Leadership', 'Innovation'
    );
  `);
}

