import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternEntity } from '../interns/intern.entity';
import { AppNotificationsService } from './app-notifications.service';
import { MailService } from './mail.service';
import { InternStatus } from '../shared-types';

// Staj bitiş sürecini üç aşamada takip eder (her sabah 09:05 TR):
//
//  1) Bitişe 2 GÜN KALA  → yöneticilere "Başarı Belgesini hazırlayın" bildirimi
//  2) Bitiş GÜNÜ          → yöneticilere "stajı bugün bitiyor, değerlendirme
//                            anketini gönderebilirsiniz" bildirimi
//  3) Bitişten SONRAKİ GÜN → değerlendirme formu stajyere OTOMATİK e-postalanır
//                            (daha önce manuel gönderilmediyse) + yöneticilere
//                            bilgi bildirimi düşer
//
// dedupeKey'ler sayesinde her aşama, her stajyer için yalnızca bir kez tetiklenir.
@Injectable()
export class InternshipEndService {
  private readonly logger = new Logger(InternshipEndService.name);

  constructor(
    @InjectRepository(InternEntity)
    private readonly internsRepo: Repository<InternEntity>,
    private readonly notifications: AppNotificationsService,
    private readonly mail: MailService,
  ) {}

  @Cron('5 9 * * *', { timeZone: 'Europe/Istanbul' })
  async handleCron() {
    await this.checkInternshipEnds();
  }

  private fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Sunucu bir gün kapalı kalırsa (bakım, çökme, deploy vb.) kesin tarih
  // eşleşmesi (`==`) o günün bildirimini SESSİZCE kaybederdi — cron bir daha
  // asla o koşulu yakalayamaz çünkü "bugün" ileri gitmiştir. Bunun yerine
  // aralık bazlı (`<=`) sorgular kullanıyoruz: her çalıştığında "kaçırılmış
  // olabilecek" kayıtları da tekrar tarar. Yinelenen bildirim/mail gitmesini
  // dedupeKey (bildirimler) ve evaluationFormSentAt (otomatik mail) engeller.
  //
  // Çok eski/pasif kayıtların ilk kurulumda toptan bildirim/mail üretmemesi
  // için makul bir yakalama penceresi (gün) uyguluyoruz.
  private readonly CATCHUP_WINDOW_DAYS = 14;

  // Dönüş: { reminders, endingToday, autoSent } sayıları (test endpoint'i için)
  async checkInternshipEnds(): Promise<{ reminders: number; endingToday: number; autoSent: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inTwoDays = new Date(today); inTwoDays.setDate(inTwoDays.getDate() + 2);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const catchupFloor = new Date(today); catchupFloor.setDate(catchupFloor.getDate() - this.CATCHUP_WINDOW_DAYS);

    let reminders = 0, endingToday = 0, autoSent = 0;

    // ── 1) Bitişe ≤2 gün kala (ama henüz bitmemiş): Başarı Belgesi hatırlatması ──
    // Aralık: bugün < bitiş ≤ bugün+2. dedupeKey (internId+endDate, tarihe göre
    // SABİT) sayesinde bu pencere içinde kaç kez taransa da tek bildirim gider.
    const endingSoon = await this.internsRepo
      .createQueryBuilder('intern')
      .leftJoinAndSelect('intern.user', 'user')
      .where('intern.status = :status', { status: InternStatus.ACTIVE })
      .andWhere('intern.endDate > :today', { today: this.fmt(today) })
      .andWhere('intern.endDate <= :inTwoDays', { inTwoDays: this.fmt(inTwoDays) })
      .getMany();
    for (const intern of endingSoon) {
      const name = intern.user?.name || 'Stajyer';
      const r = await this.notifications.notifyManagers({
        type: 'internship_ending',
        title: `🎓 ${name}'in stajı yakında bitiyor`,
        message: `${name} için Başarı Belgesini hazırlamayı unutmayın. Staj bitiş tarihi: ${new Date(intern.endDate).toLocaleDateString('tr-TR')}.`,
        link: '/dashboard/stajyerler',
        alsoUserId: intern.mentorId,
        dedupeKey: `end-2d:${intern.id}:${intern.endDate}`,
      });
      reminders += r.length;
    }

    // ── 2) Bitiş günü/geçmişse: değerlendirme anketi gönderme hatırlatması ──
    // Aralık: yakalama-penceresi ≤ bitiş ≤ bugün VE form henüz gönderilmemiş.
    // Form gönderilir gönderilmez (manuel ya da Aşama 3 ile) bu koşula bir
    // daha girmez; dedupeKey de zaten ek güvenlik.
    const endingNow = await this.internsRepo
      .createQueryBuilder('intern')
      .leftJoinAndSelect('intern.user', 'user')
      .where('intern.status = :status', { status: InternStatus.ACTIVE })
      .andWhere('intern.endDate <= :today', { today: this.fmt(today) })
      .andWhere('intern.endDate >= :floor', { floor: this.fmt(catchupFloor) })
      .andWhere('intern.evaluationFormSentAt IS NULL')
      .getMany();
    for (const intern of endingNow) {
      const name = intern.user?.name || 'Stajyer';
      const r = await this.notifications.notifyManagers({
        type: 'internship_ended',
        title: `🏁 ${name}'in stajı sona erdi`,
        message: `${name} için staj sonu değerlendirme anketini gönderebilirsiniz (stajyer detay ekranındaki "Değerlendirme Formu Gönder" butonu). Gönderilmezse yarın otomatik gönderilecek.`,
        link: '/dashboard/stajyerler',
        alsoUserId: intern.mentorId,
        dedupeKey: `end-0d:${intern.id}:${intern.endDate}`,
      });
      endingToday += r.length;
    }

    // ── 3) Bitişten en az 1 gün sonra: form otomatik gönderilir ─────────────
    // Aralık: yakalama-penceresi ≤ bitiş ≤ dün VE evaluationFormSentAt boş.
    // evaluationFormSentAt IS NULL koşulu zaten kendi kendini temizler —
    // form gönderilir gönderilmez bir daha bu sorguya girmez, bu yüzden
    // exact-date yerine <= kullanmak güvenlidir (aynı stajyere iki kez
    // otomatik mail gitmez).
    const endedYesterday = await this.internsRepo
      .createQueryBuilder('intern')
      .leftJoinAndSelect('intern.user', 'user')
      .leftJoinAndSelect('intern.company', 'company')
      .where('intern.endDate <= :yesterday', { yesterday: this.fmt(yesterday) })
      .andWhere('intern.endDate >= :floor', { floor: this.fmt(catchupFloor) })
      .andWhere('intern.evaluationFormSentAt IS NULL')
      .getMany();

    for (const intern of endedYesterday) {
      try {
        await this.sendEvaluationFormTo(intern);
        autoSent++;
        const name = intern.user?.name || 'Stajyer';
        await this.notifications.notifyManagers({
          type: 'evaluation_sent',
          title: `📨 Değerlendirme formu otomatik gönderildi: ${name}`,
          message: `${name} adlı stajyerin stajı sona erdi; değerlendirme anketi e-posta adresine otomatik olarak gönderildi.`,
          link: '/dashboard/stajyerler',
          alsoUserId: intern.mentorId,
          dedupeKey: `eval-auto:${intern.id}`,
        });
      } catch (err: any) {
        this.logger.error(`Otomatik form gönderilemedi (${intern.user?.email}): ${err.message}`);
      }
    }

    if (reminders + endingToday + autoSent > 0) {
      this.logger.log(
        `Staj bitiş kontrolü: ${reminders} belge hatırlatması, ${endingToday} bitiş bildirimi, ${autoSent} otomatik form.`,
      );
    }
    return { reminders, endingToday, autoSent };
  }

  // Formu tek bir stajyere gönderir ve evaluationFormSentAt'ı işaretler.
  // Hem cron (otomatik) hem manuel buton bu ortak metodu kullanır.
  private async sendEvaluationFormTo(intern: InternEntity): Promise<void> {
    const email = intern.user?.email;
    if (!email) throw new Error('Stajyerin e-posta adresi yok.');
    await this.mail.sendEvaluationForm({
      firmaAdi: (intern as any).company?.name || 'Electromtech',
      stajyerAdi: intern.user?.name || 'Stajyer',
      stajyerEmail: email,
    });
    await this.internsRepo.update({ id: intern.id }, { evaluationFormSentAt: new Date() });
  }

  // Manuel gönderim ("Değerlendirme Formu Gönder" butonu).
  // force=true ise daha önce gönderilmiş olsa bile yeniden gönderir.
  async sendEvaluationForm(internId: string, force = false): Promise<{ sentAt: Date }> {
    const intern = await this.internsRepo.findOne({
      where: { id: internId },
      relations: ['user', 'company'],
    });
    if (!intern) throw new NotFoundException('Stajyer bulunamadı.');
    if (intern.evaluationFormSentAt && !force) {
      throw new ConflictException(
        `Değerlendirme formu bu stajyere ${new Date(intern.evaluationFormSentAt).toLocaleDateString('tr-TR')} tarihinde zaten gönderilmiş. Yeniden göndermek için onaylayın.`,
      );
    }
    await this.sendEvaluationFormTo(intern);
    return { sentAt: new Date() };
  }
}
