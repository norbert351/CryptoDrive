import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Network } from '@aptos-labs/ts-sdk';

@Injectable()
export class ShelbyService implements OnModuleInit {
  private readonly logger = new Logger(ShelbyService.name);

  // ESM-only package; loaded at runtime. Typed as any for Nest CJS compile.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private shelbyMod: any = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const processKey = process.env.SHELBY_API_KEY?.trim();
    const configKey = this.config.get<string>('SHELBY_API_KEY')?.trim();

    this.logger.log(
      `SHELBY_API_KEY process.env loaded=${processKey ? 'yes' : 'no'} prefix=${maskKeyPrefix(processKey)}`,
    );
    this.logger.log(
      `SHELBY_API_KEY ConfigService loaded=${configKey ? 'yes' : 'no'} prefix=${maskKeyPrefix(configKey)}`,
    );

    const endpointOverride = this.config.get<string>('SHELBY_RPC_URL');
    this.logger.log(
      `SHELBY_RPC_URL=${endpointOverride ?? '(not set — using SDK default: https://api.testnet.shelby.xyz/shelby)'}`,
    );
    this.logger.log(
      `SHELBY_NETWORK=${this.config.get<string>('SHELBY_NETWORK') ?? '(not set — using SDK default: testnet)'}`,
    );
    this.logger.log(`NODE_ENV=${process.env.NODE_ENV ?? '(not set)'}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async mod(): Promise<any> {
    if (!this.shelbyMod) {
      this.logger.log('Loading Shelby SDK node module');
      // Avoid TS resolving the ESM-only `@shelby-protocol/sdk/node` subpath under `module: commonjs`.
      const dynamicImport = new Function(
        'moduleUrl',
        'return import(moduleUrl)',
      ) as (moduleUrl: string) => Promise<any>;
      this.shelbyMod = await dynamicImport('@shelby-protocol/sdk/node');
      this.logger.log('Shelby SDK node module loaded');
    }
    return this.shelbyMod;
  }

  getApiKey(): string {
    return this.config.get<string>('SHELBY_API_KEY')?.trim() ?? '';
  }

  getConfigDiagnostics(): {
    apiKeyLoaded: boolean;
    apiKeyPrefix: string;
    network: string;
    nodeEnv: string;
    envSources: Record<string, boolean>;
  } {
    const procKey = process.env.SHELBY_API_KEY?.trim();
    const cfgKey = this.config.get<string>('SHELBY_API_KEY')?.trim();
    return {
      apiKeyLoaded: Boolean(cfgKey),
      apiKeyPrefix: maskKeyPrefix(cfgKey),
      network: 'testnet',
      nodeEnv: process.env.NODE_ENV ?? 'not-set',
      envSources: {
        processEnv: Boolean(procKey),
        configService: Boolean(cfgKey),
      },
    };
  }

  network(): typeof Network.TESTNET {
    return Network.TESTNET;
  }

  async createShelbyClient() {
    const { ShelbyNodeClient } = await this.mod();
    const apiKey = this.config.get<string>('SHELBY_API_KEY')?.trim();

    this.logger.log(
      `Creating ShelbyNodeClient network=${Network.TESTNET} apiKeyLoaded=${apiKey ? 'yes' : 'no'} prefix=${maskKeyPrefix(apiKey)}`,
    );

    const client = new ShelbyNodeClient({
      network: Network.TESTNET,
      apiKey,
    });
    this.logger.log(`ShelbyNodeClient initialized network=${Network.TESTNET}`);
    return client;
  }

  /**
   * Per Shelby Node manual + browser guides: commitments from default erasure provider,
   * then RPC upload via putBlob ({@link ShelbyRPCClient.putBlob}).
   */
  async generateCommitmentsForData(data: Buffer) {
    const { createDefaultErasureCodingProvider, generateCommitments } =
      await this.mod();
    const provider = await createDefaultErasureCodingProvider();
    return generateCommitments(provider, data);
  }

  async getDefaultEncodingEnumIndex(): Promise<number> {
    const m = await this.mod();
    return m.defaultErasureCodingConfig().enumIndex;
  }

  async expectedTotalChunksets(rawSize: number): Promise<number> {
    const m = await this.mod();
    return m.expectedTotalChunksets(rawSize);
  }
}

function maskKeyPrefix(key: string | undefined): string {
  return key ? `${key.slice(0, 6)}...` : '<missing>';
}
