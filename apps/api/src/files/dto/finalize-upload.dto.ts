import { IsOptional, IsString } from 'class-validator';

export class FinalizeUploadDto {
  @IsString()
  sessionId!: string;

  @IsString()
  registerTxHash!: string;

  /** AES-GCM IV as a hex string (24 hex chars = 12 bytes). Client-generated. */
  @IsOptional()
  @IsString()
  iv?: string;

  /** AES-256-GCM DEK wrapped with AES-KW, base64-encoded. Client-generated. */
  @IsOptional()
  @IsString()
  encryptedDek?: string;

  /** Original MIME type of the file before encryption. */
  @IsOptional()
  @IsString()
  mimeType?: string;
}
