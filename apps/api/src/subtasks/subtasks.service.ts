import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubTaskEntity } from './subtask.entity';
import { TaskEntity } from '../tasks/task.entity';
import { computeTaskStatus } from '../tasks/task-status.util';
import { AppNotificationsService } from '../notifications/app-notifications.service';

@Injectable()
export class SubTasksService {
  constructor(
    @InjectRepository(SubTaskEntity)
    private readonly repo: Repository<SubTaskEntity>,
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: Repository<TaskEntity>,
    private readonly notifications: AppNotificationsService,
  ) {}

  async toggle(
    id: string,
    isCompleted: boolean,
    requesterInternId?: string,
  ): Promise<{ progress: number; status: string; subtask: SubTaskEntity; task: TaskEntity }> {
    const subtask = await this.repo.findOne({ where: { id } });
    if (!subtask) throw new NotFoundException('Alt görev bulunamadı.');

    const task = await this.tasksRepo.findOne({
      where: { id: subtask.taskId },
      relations: ['intern', 'intern.user'],
    });
    if (!task) throw new NotFoundException('Görev bulunamadı.');

    // Stajyer sadece kendi görevinin alt görevini işaretleyebilir.
    // requesterInternId undefined ise (yönetici/admin isteği) kontrol atlanır.
    if (requesterInternId !== undefined && task.internId !== requesterInternId) {
      throw new ForbiddenException('Bu görevi güncelleme yetkiniz yok.');
    }

    const previousStatus = task.status as string;

    subtask.isCompleted = isCompleted;
    await this.repo.save(subtask);

    // Aynı göreve ait tüm subtask'ları çek, ilerlemeyi hesapla
    const all = await this.repo.find({ where: { taskId: subtask.taskId } });
    const completed = all.filter(s => s.isCompleted).length;
    const progress  = all.length ? Math.round((completed / all.length) * 100) : 0;
    // Gecikmiş-farkındalıklı durum: teslim tarihi geçmiş ve görev bitmemişse
    // durum "Gecikmiş" olur/korunur — önceki mantık checkbox'a her dokunuşta
    // durumu Devam Ediyor'a çekip gecikmişliği siliyordu.
    const status = computeTaskStatus(progress, task.dueDate);

    // Değişiklik anlık olarak görevin kendisine ve dolayısıyla yönetici
    // panelindeki ilerleme göstergelerine de yansısın diye burada, aynı
    // istekte, veritabanına yazıyoruz (ayrı bir ikinci istek beklemiyoruz).
    await this.tasksRepo
      .createQueryBuilder()
      .update(TaskEntity)
      .set({ progress, status: status as any })
      .where('id = :id', { id: task.id })
      .execute();

    // Görev İLK KEZ %100'e ulaştıysa mentöre + yöneticilere "kontrol et"
    // bildirimi düş. previousStatus kontrolü: zaten Tamamlandı iken bir
    // checkbox kaldırılıp geri işaretlenirse tekrar bildirim yağmasın.
    if (status === 'Tamamlandı' && previousStatus !== 'Tamamlandı') {
      const intern: any = task.intern;
      const internName = intern?.user?.name || 'Stajyer';
      // Bildirim hatası görev güncellemesini asla engellememeli
      this.notifications
        .notifyManagers({
          type: 'task_completed',
          title: `✅ Görev tamamlandı: ${task.title}`,
          message: `${internName}, "${task.title}" görevindeki tüm alt görevleri tamamladı. Kontrol edebilirsiniz.`,
          link: '/dashboard/is-takip',
          alsoUserId: intern?.mentorId,
          // Aynı görevin aynı tamamlanma olayı için tek bildirim
          dedupeKey: `task-done:${task.id}:${new Date().toISOString().slice(0, 10)}`,
        })
        .catch(() => undefined);
    }

    const updatedTask = await this.tasksRepo.findOne({ where: { id: task.id } });

    return { progress, status, subtask, task: updatedTask as TaskEntity };
  }

  async createBulk(taskId: string, titles: string[]): Promise<SubTaskEntity[]> {
    const entities = titles
      .filter(t => t.trim())
      .map((title, i) => this.repo.create({ taskId, title: title.trim(), orderIndex: i }));
    return this.repo.save(entities);
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    await this.repo.delete({ taskId });
  }

  // Bir görev düzenlenirken gönderilen yeni checklist başlıklarını mevcut
  // alt görevlerle konumsal (orderIndex) olarak eşleştirir: başlığı aynı
  // kalan satırların isCompleted durumu korunur, yeni satırlar eklenir,
  // listeden çıkarılan satırlar silinir. Böylece yönetici sadece bir alt
  // görev ekleyip kaydettiğinde stajyerin önceki işaretlemeleri sıfırlanmaz.
  async syncForTask(taskId: string, titles: string[]): Promise<SubTaskEntity[]> {
    const existing = await this.repo.find({ where: { taskId }, order: { orderIndex: 'ASC' } });
    const cleanTitles = titles.map(t => t.trim()).filter(Boolean);

    const toSave: SubTaskEntity[] = cleanTitles.map((title, i) => {
      const match = existing[i];
      if (match) {
        match.title = title;
        match.orderIndex = i;
        return match;
      }
      return this.repo.create({ taskId, title, orderIndex: i, isCompleted: false });
    });

    const saved = toSave.length ? await this.repo.save(toSave) : [];

    const keepIds = new Set(saved.map(s => s.id).filter(Boolean));
    const toRemove = existing.filter(e => !keepIds.has(e.id));
    if (toRemove.length) await this.repo.remove(toRemove);

    return saved;
  }
}
