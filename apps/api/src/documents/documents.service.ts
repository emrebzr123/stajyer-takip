// documents.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly docsRepo: Repository<DocumentEntity>,
  ) {}

  async create(file: Express.Multer.File, userId: string, internId?: string, taskId?: string) {
    const doc = this.docsRepo.create({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: { id: userId } as any,
      internId,
      taskId,
    });
    return this.docsRepo.save(doc);
  }

  async findAll(internId?: string, taskId?: string) {
    const where: any = {};
    if (internId) where.internId = internId;
    if (taskId) where.taskId = taskId;
    return this.docsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findById(id: string) {
    const doc = await this.docsRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Doküman bulunamadı.');
    return doc;
  }

  async remove(id: string) {
    const doc = await this.findById(id);
    const filePath = path.join(process.cwd(), doc.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.docsRepo.remove(doc);
  }
}
