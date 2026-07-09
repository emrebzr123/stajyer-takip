import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnouncementEntity } from './announcement.entity';
import { CreateAnnouncementDto } from './dto/announcement.dto';
import { AppNotificationsService } from '../notifications/app-notifications.service';
import { UserRole } from '../shared-types';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly announcementsRepo: Repository<AnnouncementEntity>,
    private readonly notifications: AppNotificationsService,
  ) {}

  async create(dto: CreateAnnouncementDto, userId: string): Promise<AnnouncementEntity> {
    const announcement = this.announcementsRepo.create({
      ...dto,
      createdBy: { id: userId } as any,
    });
    const saved = await this.announcementsRepo.save(announcement);

    // Duyuru yayınlanınca TÜM stajyerlerin ziline bildirim düşer — duyurular
    // önceden yalnızca Duyurular sayfasında duruyordu, kimse fark etmiyordu.
    this.notifications
      .notifyByRole([UserRole.INTERN], {
        type: 'announcement',
        title: `📢 Yeni duyuru: ${saved.title}`,
        message: (saved as any).content?.slice(0, 120) || undefined,
        link: '/stajyer/dashboard/duyurular',
      })
      .catch(() => undefined);

    return saved;
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
