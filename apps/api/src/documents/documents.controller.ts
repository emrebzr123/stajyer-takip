import {
  Controller, Get, Post, Delete, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';   // ← uuid paketi yerine Node.js built-in
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, process.env.UPLOAD_DEST || './uploads');
        },
        filename: (_req, file, cb) => {
          const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          cb(null, `${randomUUID()}${extname(originalName)}`);
        },
      }),
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('internId') internId?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.documentsService.create(file, user.id, internId, taskId);
  }

  @Get()
  findAll(@Query('internId') internId?: string, @Query('taskId') taskId?: string) {
    return this.documentsService.findAll(internId, taskId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
