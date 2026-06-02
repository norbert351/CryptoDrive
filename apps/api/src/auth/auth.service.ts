import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccountAddress,
  AuthenticationKey,
  Ed25519PublicKey,
  Ed25519Signature,
} from '@aptos-labs/ts-sdk';
import { randomUUID } from 'crypto';

const nonceStore = new Map<
  string,
  { expires: number; issuedFor?: string }
>();

const NONCE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  issueNonce(): { nonce: string } {
    const nonce = randomUUID();
    nonceStore.set(nonce, { expires: Date.now() + NONCE_TTL_MS });
    return { nonce };
  }

  consumeNonce(nonce: string): void {
    const row = nonceStore.get(nonce);
    nonceStore.delete(nonce);
    if (!row || row.expires < Date.now()) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }
  }

  verifyWalletAndIssueToken(args: {
    address: string;
    fullMessage: string;
    publicKeyHex: string;
    signatureHex: string;
    nonce: string;
  }): { accessToken: string } {
    this.consumeNonce(args.nonce);
    if (!args.fullMessage.includes(args.nonce)) {
      throw new UnauthorizedException('Message must include server nonce');
    }

    const addr = AccountAddress.fromString(args.address);
    const publicKeyHex = args.publicKeyHex.replace(/^0x/i, '');
    const signatureHex = args.signatureHex.replace(/^0x/i, '');

    const pk = new Ed25519PublicKey(publicKeyHex);
    const derived = AuthenticationKey.fromPublicKey({ publicKey: pk }).derivedAddress();
    if (!derived.equals(addr)) {
      throw new UnauthorizedException('Public key does not match address');
    }

    const sig = new Ed25519Signature(signatureHex);
    const ok = pk.verifySignature({
      message: new TextEncoder().encode(args.fullMessage),
      signature: sig,
    });

    if (!ok) {
      throw new UnauthorizedException('Invalid signature');
    }

    return {
      accessToken: this.jwt.sign({ sub: addr.toString() }),
    };
  }
}
