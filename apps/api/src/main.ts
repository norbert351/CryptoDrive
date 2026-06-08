import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

function getAllowedOrigins(): string[] {
  const origins = new Set<string>();

  origins.add('http://localhost:3000');
  origins.add('https://crypto-drive.vercel.app');

  const envOrigin = process.env.FRONTEND_ORIGIN?.trim();
  const envUrl = process.env.FRONTEND_URL?.trim();

  if (envOrigin) origins.add(envOrigin);
  if (envUrl) origins.add(envUrl);

  return [...origins];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = getAllowedOrigins();
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
}

bootstrap().catch((error) => {
  logger.error(
    `Failed to start API: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});
