import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';
import { UserEntity } from '../users/user.entity';
import { InternEntity } from '../interns/intern.entity';
import { UserRole } from '../shared-types';
import { PushService } from './push.service';

interface CreateNotificationInput {
  userIds: string[];
  type: string;
  title: string;
  message?: string;
  link?: string;
  dedupeKey?: string;
}

@Injectable()
export class AppNotificationsService {
  private readonly logger = new Logger(AppNotificationsService.name);

  // Okunmuş bildirimler kaç günden sonra otomatik silinir (bkz. pruneOld()).
  private readonly RETENTION_DAYS = 30;

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(InternEntity)
    private readonly internsRepo: Repository<InternEntity>,
    private readonly push: PushService,
  ) {}

  // Birden fazla alıcıya aynı bildirimi oluşturur. dedupeKey verilmişse,
  // aynı anahtar + aynı alıcı için daha önce bildirim üretildiyse atlanır
  // (cron her gün çalıştığında aynı hatırlatmanın yığılmasını önler).
  async createForUsers(input: CreateNotificationInput): Promise<NotificationEntity[]> {
    const uniqueUserIds = Array.from(new Set(input.userIds.filter(Boolean)));
    if (!uniqueUserIds.length) return [];

    let targets = uniqueUserIds;
    if (input.dedupeKey) {
      const existing = await this.repo.find({
        where: { dedupeKey: input.dedupeKey, userId: In(uniqueUserIds) },
        select: ['userId'],
      });
      const already = new Set(existing.map((e) => e.userId));
      targets = uniqueUserIds.filter((id) => !already.has(id));
      if (!targets.length) return [];
    }

    const entities = targets.map((userId) =>
      this.repo.create({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        dedupeKey: input.dedupeKey,
      }),
    );
    const saved = await this.repo.save(entities);
    this.logger.log(`Bildirim oluşturuldu: "${input.title}" → ${targets.length} kullanıcı`);

    // Uygulama içi zilden BAĞIMSIZ olarak gerçek push bildirimi de gönder —
    // telefon kilitliyken / uygulama kapalıyken de görünsün diye. VAPID
    // anahtarları tanımlı değilse PushService bunu sessizce atlar, zil
    // sistemi etkilenmez.
    this.push
      .sendToUsers(targets, { title: input.title, message: input.message, link: input.link, tag: input.type })
      .catch(() => undefined);

    return saved;
  }

  // Yönetici panelini kullanan herkese (admin + manager) bildirim.
  // İsteğe bağlı olarak belirli bir mentör de eklenir (zaten manager
  // olduğu için genelde listede olur; ekstra garanti).
  async notifyManagers(input: Omit<CreateNotificationInput, 'userIds'> & { alsoUserId?: string }) {
    const managers = await this.usersRepo.find({
      where: { role: In([UserRole.ADMIN, UserRole.MANAGER]) },
      select: ['id'],
    });
    const ids = managers.map((m) => m.id);
    if (input.alsoUserId) ids.push(input.alsoUserId);
    return this.createForUsers({ ...input, userIds: ids });
  }

  // Belirli bir STAJYERLE ilgili bir olay (görev tamamlandı, belge
  // yüklendi, staj bitiyor vb.) olduğunda kullanılır. Yeni hiyerarşide
  // (Yönetici → Personel → Stajyer) bu bildirim SADECE stajyerin mentörü
  // olan Personel'e gider — Yönetici stajyer seviyesindeki hiçbir şeyi
  // görmez (Yönetici sadece stajyerin "Ana Görev" özetiyle ilgilenir).
  //
  // Mentör atanmamışsa (güvenlik ağı), TÜM Personel'e (manager) gider —
  // yine Yönetici'ye gitmez. Böylece hiçbir bildirim kimseye ulaşmadan
  // kaybolmaz, ama Yönetici'nin gereksiz stajyer trafiğiyle boğulması da
  // engellenmiş olur.
  async notifyMentor(
    internId: string,
    input: Omit<CreateNotificationInput, 'userIds'>,
  ) {
    const intern = await this.internsRepo.findOne({ where: { id: internId }, select: ['id', 'mentorId'] });

    let ids: string[] = [];
    if (intern?.mentorId) {
      ids = [intern.mentorId];
    } else {
      const managers = await this.usersRepo.find({ where: { role: UserRole.MANAGER }, select: ['id'] });
      ids = managers.map((m) => m.id);
    }

    if (!ids.length) return [];
    return this.createForUsers({ ...input, userIds: ids });
  }

  // Belirli rollerdeki TÜM kullanıcılara bildirim (örn. duyuru → tüm stajyerler).
  async notifyByRole(roles: UserRole[], input: Omit<CreateNotificationInput, 'userIds'>) {
    const users = await this.usersRepo.find({ where: { role: In(roles) }, select: ['id'] });
    return this.createForUsers({ ...input, userIds: users.map((u) => u.id) });
  }

  async findForUser(userId: string, limit = 30): Promise<NotificationEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    // userId koşulu: kullanıcı sadece KENDİ bildirimini okundu yapabilir
    await this.repo.update({ id, userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }

  // Tek bir bildirimi kalıcı olarak siler (zil listesindeki ✕ butonu).
  // userId koşulu: kullanıcı sadece KENDİ bildirimini silebilir.
  async remove(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }

  // Kullanıcının OKUNMUŞ tüm bildirimlerini siler ("Okunanları Temizle").
  // Okunmamışlar kalır — kullanıcı henüz görmediği bir şeyi kaybetmesin.
  async clearRead(userId: string): Promise<number> {
    const result = await this.repo.delete({ userId, isRead: true });
    return result.affected || 0;
  }

  // Kullanıcının TÜM bildirimlerini siler (okunmuş/okunmamış fark etmeksizin).
  async clearAll(userId: string): Promise<number> {
    const result = await this.repo.delete({ userId });
    return result.affected || 0;
  }

  // Otomatik arka plan temizliği — cron ile çağrılır (bkz. DueReminderService
  // veya ayrı bir NotificationsCleanupService). RETENTION_DAYS'ten eski VE
  // okunmuş bildirimleri siler. Okunmamış bildirimler ne kadar eski olursa
  // olsun SİLİNMEZ — kullanıcı görmeden kaybolmasın.
  async pruneOld(): Promise<number> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - this.RETENTION_DAYS);
    const result = await this.repo.delete({
      isRead: true,
      createdAt: LessThan(threshold),
    });
    const count = result.affected || 0;
    if (count > 0) this.logger.log(`Otomatik temizlik: ${count} eski bildirim silindi.`);
    return count;
  }
}
