import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Req, Post } from '@nestjs/common';
import { AppNotificationsService } from './app-notifications.service';
import { DueReminderService } from './due-reminder.service';
import { InternshipEndService } from './internship-end.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly service: AppNotificationsService,
    private readonly dueReminder: DueReminderService,
    private readonly internshipEnd: InternshipEndService,
    private readonly push: PushService,
  ) {}

  // Frontend'in pushManager.subscribe() çağrısında kullanacağı VAPID
  // public key. Guard altında olduğu için sadece giriş yapmış kullanıcı
  // görebilir (kritik bir sır değil ama gereksiz açık etmeye gerek yok).
  @Get('push/public-key')
  getPushPublicKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  // Tarayıcıdan alınan PushSubscription nesnesini kaydeder.
  @Post('push/subscribe')
  subscribePush(
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
    @Req() req: any,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.push.subscribe(req.user.id, body, userAgent);
  }

  // Kullanıcı bildirim iznini kapattığında ya da abonelikten çıkarken.
  @Post('push/unsubscribe')
  async unsubscribePush(@Body() body: { endpoint: string }) {
    await this.push.unsubscribe(body.endpoint);
    return { message: 'Abonelik kaldırıldı.' };
  }

  @Get()
  findMine(@Req() req: any) {
    return this.service.findForUser(req.user.id);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return { count: await this.service.unreadCount(req.user.id) };
  }

  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    await this.service.markAllRead(req.user.id);
    return { message: 'Tüm bildirimler okundu olarak işaretlendi.' };
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    await this.service.markRead(id, req.user.id);
    return { message: 'Okundu.' };
  }

  // Tek bir bildirimi zil listesinden kalıcı olarak siler (✕ butonu).
  @Delete(':id')
  async removeOne(@Param('id') id: string, @Req() req: any) {
    await this.service.remove(id, req.user.id);
    return { message: 'Bildirim silindi.' };
  }

  // Okunmuş tüm bildirimleri temizler ("Okunanları Temizle" butonu).
  // Okunmamışlar kullanıcı görmeden kaybolmasın diye korunur.
  @Delete('clear/read')
  async clearRead(@Req() req: any) {
    const count = await this.service.clearRead(req.user.id);
    return { message: `${count} bildirim temizlendi.`, count };
  }

  // Teslim tarihi hatırlatma kontrolünü elle tetikler (test/demo için).
  // Normalde her sabah 09:00'da cron ile otomatik çalışır.
  @Post('run-due-check')
  async runDueCheck() {
    const created = await this.dueReminder.checkDueTasks();
    return { message: `Kontrol tamamlandı. ${created} hatırlatma oluşturuldu.` };
  }

  // Staj bitiş kontrolünü elle tetikler (test/demo için).
  // Normalde her sabah 09:05'te cron ile otomatik çalışır.
  @Post('run-internship-end-check')
  async runInternshipEndCheck() {
    const r = await this.internshipEnd.checkInternshipEnds();
    return {
      message: `Kontrol tamamlandı. ${r.reminders} belge hatırlatması, ${r.endingToday} bitiş bildirimi, ${r.autoSent} otomatik form gönderimi.`,
      ...r,
    };
  }
}
