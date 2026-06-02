import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';
import { FinalizeUploadDto } from './dto/finalize-upload.dto';

@Controller()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly files: FilesService) {
    const uploadRoot = join(process.cwd(), 'data', 'pending-uploads');
    if (!existsSync(uploadRoot)) {
      mkdirSync(uploadRoot, { recursive: true });
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, join(process.cwd(), 'data', 'pending-uploads')),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: Request & { walletAddress?: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.path) {
      throw new BadRequestException('file field is required');
    }
    const wallet = req.walletAddress!;
    return this.files.prepareUpload({
      walletAddress: wallet,
      diskPath: file.path,
      originalFilename: file.originalname,
    });
  }

  @Post('upload/complete')
  @UseGuards(JwtAuthGuard)
  async complete(
    @Req() req: Request & { walletAddress?: string },
    @Body() body: FinalizeUploadDto,
  ) {
    return this.files.finalizeUpload({
      walletAddress: req.walletAddress!,
      sessionId: body.sessionId,
      registerTxHash: body.registerTxHash,
      iv: body.iv,
      encryptedDek: body.encryptedDek,
      mimeType: body.mimeType,
    });
  }

  @Get('files')
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: Request & { walletAddress?: string },
    @Query('owner') owner: string,
  ) {
    if (!owner) {
      throw new BadRequestException('owner query parameter is required');
    }
    return this.files.listForOwner(req.walletAddress!, owner);
  }

  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  async downloadFile(@Req() req: Request & { walletAddress?: string }, @Param('id') id: string) {
    this.logger.log(`downloadFile legacy route /download/${id} wallet=${req.walletAddress}`);
    return this.files.getDownloadInfo(req.walletAddress!, id);
  }

  @Get('files/:id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFileAlias(@Req() req: Request & { walletAddress?: string }, @Param('id') id: string) {
    this.logger.log(`downloadFileAlias route /files/${id}/download wallet=${req.walletAddress}`);
    return this.files.getDownloadInfo(req.walletAddress!, id);
  }
}
