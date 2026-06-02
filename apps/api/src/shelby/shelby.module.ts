import { Global, Module } from '@nestjs/common';
import { ShelbyService } from './shelby.service';

@Global()
@Module({
  providers: [ShelbyService],
  exports: [ShelbyService],
})
export class ShelbyModule {}
