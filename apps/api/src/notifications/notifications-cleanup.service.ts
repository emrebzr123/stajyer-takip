import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppNotificationsService } from './app-notifications.service';

// Okunmuş ve 30 günden eski bildirimleri her gece sessizce siler. Bu olmadan
// `notifications` tablosu sonsuza kadar büyür; hiçbir kullanıcı hiçbir zaman
// bildirim silmese bile veritabanı şişmesin diye arka planda çalışır.
// Okunmamış bildirimler yaşına bakılmaksızın SİLİNMEZ.
@Injectable()
export class NotificationsCleanupService {
  private readonly logger = new Logger(NotificationsCleanupService.name);

  constructor(private readonly notifications: AppNotificationsService) {}

  @Cron('0 3 * * *', { timeZone: 'Europe/Istanbul' })
  async handleCron() {
    await this.notifications.pruneOld();
  }
}
