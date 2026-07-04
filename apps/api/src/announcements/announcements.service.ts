import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnouncementEntity } from './announcement.entity';
import { CreateAnnouncementDto } from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly announcementsRepo: Repository<AnnouncementEntity>,
  ) {}

  async create(dto: CreateAnnouncementDto, userId: string): Promise<AnnouncementEntity> {
    const announcement = this.announcementsRepo.create({
      ...dto,
      createdBy: { id: userId } as any,
    });
    return this.announcementsRepo.save(announcement);
  }

  async findAll(): Promise<AnnouncementEntity[]> {
    return this.announcementsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<AnnouncementEntity> {
    const a = await this.announcementsRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Duyuru bulunamadı.');
    return a;
  }

  async remove(id: string): Promise<void> {
    const a = await this.findById(id);
    await this.announcementsRepo.remove(a);
  }
}
