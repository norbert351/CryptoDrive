import { IsOptional, IsString } from 'class-validator';

export class VerifyWalletDto {
  @IsString()
  address!: string;

  @IsString()
  fullMessage!: string;

  @IsString()
  publicKeyHex!: string;

  @IsString()
  signatureHex!: string;

  @IsString()
  nonce!: string;

  @IsOptional()
  @IsString()
  walletName?: string;
}
