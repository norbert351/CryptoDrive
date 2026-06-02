import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for drizzle-kit');
}

const parsedDatabaseUrl = new URL(databaseUrl);

if (parsedDatabaseUrl.protocol !== 'mysql:') {
  throw new Error(
    `DATABASE_URL must use mysql:// for drizzle-kit mysql dialect; received ${parsedDatabaseUrl.protocol}`,
  );
}

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: databaseUrl,
  },
});
