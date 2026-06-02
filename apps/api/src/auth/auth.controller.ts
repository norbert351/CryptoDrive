import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyWalletDto } from './dto/verify-wallet.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('challenge')
  challenge() {
    return this.auth.issueNonce();
  }

  @Post('verify')
  verify(@Body() body: VerifyWalletDto) {
    return this.auth.verifyWalletAndIssueToken(body);
  }
}
