import { config } from 'dotenv';

config();

export default {
  databaseUrl: `postgres://${process.env.POSTGRES_USERNAME}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}`,
  migrationsTable: 'pgmigrations',
  dir: 'src/common/db/migrations',
  direction: 'up',
  count: Infinity,
};
