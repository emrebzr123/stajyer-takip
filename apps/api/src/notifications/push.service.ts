import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscriptionEntity } from './push-subscription.entity';

// Web Push — telefon KİLİTLİYKEN / tarayıcı/uygulama KAPALIYKEN bile
// bildirim gösterebilmek için. Önceki zil sistemi sadece uygulama açıkken
// 30 saniyede bir sunucuyu yokluyordu (polling); bu, uygulama kapalıyken
// hiçbir şey göstermiyordu. VAPID anahtarları .env'den okunur — production'da
// (Railway) bu değişkenlerin ayarlanmış olması ŞARTTIR, yoksa push sessizce
// devre dışı kalır (uygulama içi zil yine çalışmaya devam eder, sadece
// kilitli telefon bildirimi gitmez).
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly repo: Repository<PushSubscriptionEntity>,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:destek@electromtech.com';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY tanımlı değil — push bildirimleri devre dışı (uygulama içi zil çalışmaya devam eder).',
      );
    }
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async subscribe(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    const existing = await this.repo.findOne({ where: { endpoint: sub.endpoint } });
    if (existing) {
      existing.userId = userId;
      existing.p256dh = sub.keys.p256dh;
      existing.auth = sub.keys.auth;
      existing.userAgent = userAgent || existing.userAgent;
      return this.repo.save(existing);
    }
    return this.repo.save(
      this.repo.create({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent }),
    );
  }

  async unsubscribe(endpoint: string) {
    await this.repo.delete({ endpoint });
  }

  // Belirtilen kullanıcıların TÜM cihazlarına push gönderir. Süresi dolmuş
  // / silinmiş abonelikler (410 Gone / 404) otomatik temizlenir — kalıcı
  // hatalar birikip her seferinde tekrar denenmesin diye.
  async sendToUsers(
    userIds: string[],
    payload: { title: string; message?: string; link?: string; tag?: string },
  ): Promise<void> {
    if (!this.configured || !userIds.length) return;

    const subs = await this.repo.find({ where: userIds.map((userId) => ({ userId })) });
    if (!subs.length) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
            body,
          );
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await this.repo.delete({ id: sub.id });
          } else {
            this.logger.warn(`Push gönderilemedi (${sub.endpoint.slice(0, 40)}...): ${err?.message}`);
          }
        }
      }),
    );
  }
}
