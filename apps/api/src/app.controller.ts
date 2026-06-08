import { Controller, Get, Logger } from '@nestjs/common';
import { AppService, type ShelbyDiagnostics } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return { ok: true, app: 'CryptoDrive API' };
  }

  @Get('debug/shelby')
  async debugShelby(): Promise<ShelbyDiagnostics> {
    this.logger.log('GET /debug/shelby — running Shelby diagnostics');
    const diagnostics = await this.appService.debugShelby();
    this.logger.log(`GET /debug/shelby — conclusion: ${diagnostics.conclusion}`);
    return diagnostics;
  }
}
