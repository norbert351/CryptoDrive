import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';

export const files = mysqlTable('files', {
  id: varchar('id', { length: 36 }).primaryKey(),
  filename: varchar('filename', { length: 512 }).notNull(),
  blobName: varchar('blob_name', { length: 1024 }).notNull(),
  ownerAddress: varchar('owner_address', { length: 128 }).notNull(),
  size: int('size').notNull(),
  mimeType: varchar('mime_type', { length: 256 }),
  iv: varchar('iv', { length: 64 }),
  encryptedDek: text('encrypted_dek'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sharedFiles = mysqlTable('shared_files', {
  id: varchar('id', { length: 36 }).primaryKey(),
  fileId: varchar('file_id', { length: 36 }).notNull(),
  sharedBy: varchar('shared_by', { length: 128 }).notNull(),
  sharedWith: varchar('shared_with', { length: 128 }).notNull(),
  revokedAt: timestamp('revoked_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type StoredFile = typeof files.$inferSelect;
export type StoredSharedFile = typeof sharedFiles.$inferSelect;
