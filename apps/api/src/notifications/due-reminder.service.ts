import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TaskEntity } from '../tasks/task.entity';
import { AppNotificationsService } from './app-notifications.service';
import { TaskStatus } from '../shared-types';

// Teslim tarihi yaklaşan görevler için stajyere uygulama içi hatırlatma üretir.
// Her sabah 09:00'da (Türkiye saati) çalışır; dedupeKey sayesinde aynı görev
// için aynı gün ikinci kez bildirim üretilmez (elle tetikleme dahil).
@Injectable()
export class DueReminderService {
  private readonly logger = new Logger(DueReminderService.name);

  // Kaç gün kala hatırlatılacağı (bugün dahil): 0 = bugün son gün, 1 = yarın, 2 = 2 gün kaldı
  private readonly REMIND_WITHIN_DAYS = 2;

  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: Repository<TaskEntity>,
    private readonly notifications: AppNotificationsService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'Europe/Istanbul' })
  async handleCron() {
    await this.checkDueTasks();
  }

  // Dönüş değeri: oluşturulan hatırlatma sayısı
  async checkDueTasks(): Promise<number> {
    // Önce süresi geçmiş görevleri "Gecikmiş" olarak işaretle. Bu olmadan
    // hiçbir görev otomatik olarak Gecikmiş'e geçmiyordu — durum sadece seed
    // verisinde vardı ve tarih geçse bile görev "Devam Ediyor"da kalıyordu.
    await this.markOverdueTasks();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + this.REMIND_WITHIN_DAYS);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Tamamlanmamış ve teslim tarihi [bugün, bugün+2] aralığında olan görevler.
    // dueDate string ('YYYY-MM-DD') tutulduğu için sözlük sırası = tarih sırası,
    // string karşılaştırmasıyla güvenli şekilde filtrelenebilir.
    const tasks = await this.tasksRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.intern', 'intern')
      .where('task.status != :done', { done: TaskStatus.COMPLETED })
      .andWhere('task.dueDate >= :start', { start: fmt(today) })
      .andWhere('task.dueDate <= :end', { end: fmt(limit) })
      .getMany();

    let created = 0;
    for (const task of tasks) {
      const internUserId = (task.intern as any)?.userId;
      if (!internUserId) continue;

      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400000);
      const when =
        daysLeft <= 0 ? 'BUGÜN son gün' : daysLeft === 1 ? 'yarın son gün' : `son ${daysLeft} gün`;

      const result = await this.notifications.createForUsers({
        userIds: [internUserId],
        type: 'due_reminder',
        title: `⏰ Teslim tarihi yaklaşıyor: ${task.title}`,
        message: `"${task.title}" görevi için ${when} (${new Date(task.dueDate).toLocaleDateString('tr-TR')}).`,
        link: '/stajyer/dashboard/gorevler',
        // Aynı görev + aynı gün = tek bildirim
        dedupeKey: `due:${task.id}:${fmt(today)}`,
      });
      created += result.length;
    }

    if (created > 0) this.logger.log(`Teslim hatırlatması: ${created} bildirim oluşturuldu.`);
    return created;
  }

  // Teslim tarihi geçmiş ve bitmemiş görevleri Gecikmiş'e çeker; yeni geciken
  // her görev için stajyere bir kez (dedupeKey) uyarı bildirimi düşer.
  private async markOverdueTasks(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Önce yeni gecikenleri (bildirim için) çek, sonra topluca güncelle
    const newlyOverdue = await this.tasksRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.intern', 'intern')
      .where('task.status NOT IN (:...done)', { done: [TaskStatus.COMPLETED, TaskStatus.DELAYED] })
      .andWhere('task.dueDate < :today', { today: fmt(today) })
      .getMany();

    if (!newlyOverdue.length) return;

    await this.tasksRepo
      .createQueryBuilder()
      .update(TaskEntity)
      .set({ status: TaskStatus.DELAYED })
      .whereInIds(newlyOverdue.map((t) => t.id))
      .execute();

    for (const task of newlyOverdue) {
      const internUserId = (task.intern as any)?.userId;
      if (!internUserId) continue;
      await this.notifications.createForUsers({
        userIds: [internUserId],
        type: 'task_overdue',
        title: `🚨 Görev gecikti: ${task.title}`,
        message: `"${task.title}" görevinin teslim tarihi (${new Date(task.dueDate).toLocaleDateString('tr-TR')}) geçti. Lütfen en kısa sürede tamamlayın.`,
        link: '/stajyer/dashboard/gorevler',
        dedupeKey: `overdue:${task.id}`,
      });
    }
    this.logger.log(`${newlyOverdue.length} görev Gecikmiş olarak işaretlendi.`);
  }
}
