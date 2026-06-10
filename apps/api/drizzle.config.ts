import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: 'JDcHemu1ZvuknqJ.root',
    password: process.env.DB_PASSWORD!,
    database: 'cryptodrive',
    ssl: {
      rejectUnauthorized: false,
    },
  },
});