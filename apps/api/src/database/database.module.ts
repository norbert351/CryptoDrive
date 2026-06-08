import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'mysql2/promise';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE';

const logger = new Logger('DatabaseModule');

function parseDatabaseUrl(databaseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid mysql:// connection string');
  }
  if (parsed.protocol !== 'mysql:') {
    throw new Error(
      `DATABASE_URL must use mysql:// for mysql2; received ${parsed.protocol || '<missing>'}`,
    );
  }
  return parsed;
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL')?.trim();
        if (!databaseUrl) {
          logger.error('DATABASE_URL is not configured');
          throw new Error(
            'DATABASE_URL is missing. Check apps/api/.env',
          );
        }

        const parsedUrl = parseDatabaseUrl(databaseUrl);
        const host = decodeURIComponent(parsedUrl.hostname);
        const port = Number(parsedUrl.port) || 3306;
        const user = decodeURIComponent(parsedUrl.username);
        const database = parsedUrl.pathname.replace(/^\//, '');

        // Normalize password: URL parser returns "" for "root:@localhost",
        // which mysql2's ConnectionConfig would convert to undefined via
        // the falsy coalesce in `this.password = options.password || undefined`.
        // We pass it as empty string so mysql2's caching_sha2_password plugin
        // handles it correctly (returns empty token for empty password).
        const rawPassword = decodeURIComponent(parsedUrl.password);
        const password = rawPassword ?? '';

        const [{ createPool }, { drizzle }] = await Promise.all([
          import('mysql2/promise'),
          import('drizzle-orm/mysql2'),
        ]);

        const maskedUrl = databaseUrl.replace(
          /:\/\/.+?:.+?@/,
          '://***:***@',
        );
        Logger.log(`DATABASE_URL: ${maskedUrl}`);
        Logger.log(`DB Host: ${host}`);
        Logger.log(`DB User: ${user}`);
        Logger.log(`DB Database: ${database}`);

        try {
          const pool: Pool = createPool({
            host,
            port,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 10,
            connectTimeout: 10000,
          });

          await pool.query('SELECT 1');
          Logger.log('Database connection health check: OK');

          Logger.log('MySQL connection initialized');
          return drizzle(pool, { schema, mode: 'default' });
        } catch (error) {
          Logger.error(
            'Database connection failed',
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
