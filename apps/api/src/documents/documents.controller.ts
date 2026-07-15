import {
  Controller, Get, Post, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';   // ← uuid paketi yerine Node.js built-in
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const uploadInterceptor = FileInterceptor('file', {
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
});

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(uploadInterceptor)
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Query('internId') internId?: string,
    @Query('taskId') taskId?: string,
  ) {
    // Stajyer yüklüyorsa internId'yi JWT'den al — frontend'in göndermesine
    // gerek yok ve başka stajyer adına yükleme yapılamaz.
    const effectiveInternId = user?.role === 'intern' ? user?.internId : internId;
    return this.documentsService.create(
      file,
      { id: user.id, role: user.role, name: user.name },
      effectiveInternId,
      taskId,
    );
  }

  // Yönetici, bir belgeyi seçili stajyerlerle ya da TÜM stajyerlerle paylaşır.
  // Body (multipart/form-data): file + recipientInternIds (JSON string dizi)
  // + shareWithAll ('true'/'false' string olarak gelir).
  @Post('share')
  @UseInterceptors(uploadInterceptor)
  share(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Body('recipientInternIds') recipientInternIdsRaw?: string,
    @Body('shareWithAll') shareWithAllRaw?: string,
  ) {
    if (user?.role === 'intern') {
      throw new ForbiddenException('Sadece yöneticiler belge paylaşabilir.');
    }
    let recipientInternIds: string[] = [];
    try { recipientInternIds = recipientInternIdsRaw ? JSON.parse(recipientInternIdsRaw) : []; }
    catch { recipientInternIds = []; }
    const shareWithAll = shareWithAllRaw === 'true';

    return this.documentsService.shareWithInterns(
      file,
      { id: user.id, name: user.name },
      recipientInternIds,
      shareWithAll,
    );
  }

  // NOT: internId parametresi önceden HİÇ doğrulanmıyordu — bir stajyer
  // kendi internId'si yerine BAŞKA bir stajyerin ID'sini query'e koyarak
  // onun belge listesini görebilirdi. Artık stajyer için bu parametre
  // JWT'deki gerçek internId ile zorla eziliyor, frontend'in gönderdiği
  // değere güvenilmiyor.
  @Get()
  findAll(@CurrentUser() user: any, @Query('internId') internId?: string, @Query('taskId') taskId?: string) {
    const effectiveInternId = user?.role === 'intern' ? user?.internId : internId;
    return this.documentsService.findAll(effectiveInternId, taskId);
  }

  // NOT: aynı sızıntı riski — bir stajyer ID'sini bilerek başka bir
  // stajyerin belge META verisini (dosya adı, kime ait olduğu vb.)
  // görebilirdi. Artık stajyer sadece kendi yüklediği YA DA kendisiyle
  // paylaşılmış (sharedWithAll ya da recipients'ta olduğu) belgelere
  // erişebiliyor — aynı mantık remove() içinde de kullanılıyor.
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const doc = await this.documentsService.findById(id);
    if (user?.role === 'intern') {
      const hasAccess = await this.documentsService.internHasAccess(doc, user?.internId);
      if (!hasAccess) throw new ForbiddenException('Bu belgeye erişim yetkiniz yok.');
    }
    return doc;
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.remove(id, { id: user.id, role: user.role, internId: user.internId });
  }
}
