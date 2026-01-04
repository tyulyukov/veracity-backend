import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

interface MigrationModule {
  up: (pgm: MigrationBuilder) => Promise<void>;
  down?: (pgm: MigrationBuilder) => Promise<void>;
}

class MigrationBuilder {
  private statements: string[] = [];

  sql(query: string): void {
    this.statements.push(query);
  }

  getStatements(): string[] {
    return this.statements;
  }
}

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        run_on TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(process.cwd(), 'src/common/db/migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.ts') && f !== 'config.ts')
      .sort();

    for (const file of files) {
      const migrationName = file.replace('.ts', '');

      const { rows } = await pool.query('SELECT 1 FROM pgmigrations WHERE name = $1', [
        migrationName,
      ]);

      if (rows.length > 0) {
        continue;
      }

      const migrationPath = path.join(migrationsDir, file);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migration: MigrationModule = require(migrationPath);

      if (typeof migration.up !== 'function') {
        throw new Error(`Migration ${file} does not export an 'up' function`);
      }

      const pgm = new MigrationBuilder();
      await migration.up(pgm);

      const statements = pgm.getStatements();

      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (err) {
          console.error(`Error in migration ${file}:`, err);
          throw err;
        }
      }

      await pool.query('INSERT INTO pgmigrations (name) VALUES ($1)', [migrationName]);
    }

  } finally {
    await pool.end();
  }
}
