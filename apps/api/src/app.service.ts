import { Injectable, Logger } from '@nestjs/common';
import { ShelbyService } from './shelby/shelby.service';

export interface HttpResult {
  status: number;
  statusText: string;
  ok: boolean;
  url?: string;
  body?: string;
  parsed?: Record<string, unknown> | null;
  uploadId?: string;
}

export interface ShelbyDiagnostics {
  timestamp: string;
  config: ReturnType<ShelbyService['getConfigDiagnostics']>;
  clientCreated?: boolean;
  rpcBaseUrl?: string;
  multipartStart?: HttpResult;
  multipartPartUpload?: HttpResult;
  multipartComplete?: HttpResult;
  networkError?: string;
  clientError?: string;
  conclusion?: string;
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly shelby: ShelbyService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async debugShelby(): Promise<ShelbyDiagnostics> {
    const diagnostics: ShelbyDiagnostics = {
      timestamp: new Date().toISOString(),
      config: this.shelby.getConfigDiagnostics(),
    };

    if (!diagnostics.config.apiKeyLoaded) {
      diagnostics.conclusion = 'Shelby API key is missing — uploads will fail';
      return diagnostics;
    }

    try {
      const client = await this.shelby.createShelbyClient();
      diagnostics.clientCreated = true;

      const rpcUrl = (client.rpc as { baseUrl?: string }).baseUrl ?? 'unknown';
      diagnostics.rpcBaseUrl = rpcUrl;

      const testAccount = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const testBlobName = `cryptodrive/debug-${Date.now()}/healthcheck.txt`;
      const testData = new TextEncoder().encode('Shelby health check');
      const apiKey = this.shelby.getApiKey();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const startUrl = `${rpcUrl}/v1/multipart-uploads`;
      const startResponse = await fetch(startUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rawAccount: testAccount,
          rawBlobName: testBlobName,
          rawPartSize: 5 * 1024 * 1024,
        }),
      });
      diagnostics.multipartStart = {
        status: startResponse.status,
        statusText: startResponse.statusText,
        ok: startResponse.ok,
      };

      if (!startResponse.ok) {
        diagnostics.multipartStart.body = await startResponse.text().catch(() => '');
        diagnostics.conclusion = 'Shelby multipart upload start failed';
        return diagnostics;
      }

      const startJson = (await startResponse.json()) as { uploadId: string };
      diagnostics.multipartStart.uploadId = startJson.uploadId;
      const uploadId = startJson.uploadId;

      const partHeaders: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
      };
      if (apiKey) partHeaders['Authorization'] = `Bearer ${apiKey}`;

      const partUrl = `${rpcUrl}/v1/multipart-uploads/${uploadId}/parts/0`;
      const partResponse = await fetch(partUrl, {
        method: 'PUT',
        headers: partHeaders,
        body: testData,
      });
      diagnostics.multipartPartUpload = {
        status: partResponse.status,
        statusText: partResponse.statusText,
        ok: partResponse.ok,
      };

      if (!partResponse.ok) {
        diagnostics.multipartPartUpload.body = await partResponse.text().catch(() => '');
        diagnostics.conclusion = 'Shelby part upload failed';
        return diagnostics;
      }

      const completeHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) completeHeaders['Authorization'] = `Bearer ${apiKey}`;

      const completeUrl = `${rpcUrl}/v1/multipart-uploads/${uploadId}/complete`;
      const completeResponse = await fetch(completeUrl, {
        method: 'POST',
        headers: completeHeaders,
      });
      const completeBody = await completeResponse.text().catch(() => '');
      diagnostics.multipartComplete = {
        status: completeResponse.status,
        statusText: completeResponse.statusText,
        ok: completeResponse.ok,
        url: completeUrl,
        body: completeBody,
      };
      try {
        diagnostics.multipartComplete.parsed = JSON.parse(completeBody) as Record<string, unknown>;
      } catch {
        diagnostics.multipartComplete.parsed = null;
      }

      diagnostics.conclusion = completeResponse.ok
        ? 'Shelby multipart upload works correctly'
        : 'Shelby multipart upload completion returned an error — server-side issue';
    } catch (fetchError) {
      diagnostics.networkError = fetchError instanceof Error ? fetchError.message : String(fetchError);
      diagnostics.conclusion = 'Network error reaching Shelby endpoint';
    }

    return diagnostics;
  }
}
