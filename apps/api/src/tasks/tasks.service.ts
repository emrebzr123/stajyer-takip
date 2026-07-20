import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';
import { TaskCommentEntity } from './task-comment.entity';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { TaskStatus } from '../shared-types';
import { MailService } from '../notifications/mail.service';
import { AppNotificationsService } from '../notifications/app-notifications.service';
import { SubTasksService } from '../subtasks/subtasks.service';
import { computeTaskStatus } from './task-status.util';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: Repository<TaskEntity>,
    @InjectRepository(TaskCommentEntity)
    private readonly commentsRepo: Repository<TaskCommentEntity>,
    private readonly mailService: MailService,
    private readonly notifications: AppNotificationsService,
    private readonly subTasksService: SubTasksService,
  ) {}

  private getBaseQuery() {
    return this.tasksRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.intern', 'intern')
      .leftJoinAndSelect('intern.user', 'user')
      .leftJoinAndSelect('intern.department', 'internDept')
      .leftJoinAndSelect('intern.company', 'internCompany')
      .leftJoinAndSelect('task.department', 'department')
      // NOT: TaskEntity.subtasks ilişkisi { eager: true } olsa da, TypeORM'de
      // eager ilişkiler sadece repository.find()/findOne() ile çalışır;
      // createQueryBuilder() kullanıldığında eager devre dışı kalır. Bu yüzden
      // alt görevler (checklist) stajyer panelinde hiç görünmüyordu — burada
      // açıkça join ediyoruz.
      .leftJoinAndSelect('task.subtasks', 'subtasks')
      .addOrderBy('subtasks.orderIndex', 'ASC');
  }

  async create(dto: CreateTaskDto): Promise<any> {
    const task = this.tasksRepo.create(dto);
    const saved = await this.tasksRepo.save(task);
    const full  = await this.findById(saved.id);

    // Görev atama maili otomatik gönder — mail.controller.ts'deki
    // interns.controller.ts'de yaptığımız aynı düzeltme: `await` KALDIRILDI.
    // Önceden "Yeni Görev Oluştur" isteği, Gmail SMTP yanıt verene kadar
    // (bazen 10-30+ saniye, özellikle container yeni uyanmışsa) tamamlanmıyor,
    // tarayıcı zaman aşımına düşüp "hata oluştu" gösteriyordu — oysa görev
    // zaten yukarıda veritabanına yazılmıştı. Artık mail arka planda gider,
    // kendi içindeki try/catch sayesinde (mail.service.ts) hata olursa
    // sadece loglanır, isteği etkilemez.
    const intern = full.intern as any;
    if (intern?.user?.email) {
      const now = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      const bitis = new Date(full.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      this.mailService.sendTaskAssignment({
        firmaAdi:        intern.company?.name   || 'Electromtech',
        stajyerAdi:     intern.user.name        || '',
        stajyerEmail:   intern.user.email,
        gorevAdi:       full.title,
        gorevAciklamasi: full.description       || '',
        olusturmaTarihi: now,
        bitisTarihi:    bitis,
      }).catch(() => undefined);
    }

    // Stajyere uygulama içi (zil) bildirim — mailden bağımsız, mail hata
    // verse bile stajyer panele girdiğinde yeni görevi anında fark eder.
    if (intern?.userId || intern?.user?.id) {
      this.notifications
        .createForUsers({
          userIds: [intern.userId || intern.user.id],
          type: 'task_assigned',
          title: `📋 Yeni görev atandı: ${full.title}`,
          message: `Son teslim: ${new Date(full.dueDate).toLocaleDateString('tr-TR')}. Detaylar için Görevlerim sayfasına bakın.`,
          link: '/stajyer/dashboard/gorevler',
        })
        .catch(() => undefined);
    }

    return full;
  }

  async findAll(query: TaskQueryDto) {
    const { page = 1, limit = 10, search, status, priority, departmentId, internId, excludeHidden } = query;

    // NOT: task.subtasks bire-çok (one-to-many) bir join. leftJoinAndSelect +
    // skip()/take() birlikte kullanılırsa TypeORM, LIMIT/OFFSET'i satır
    // (task × subtask) düzeyinde uygular; bu da bir görevin birden fazla alt
    // görevi olduğunda sayfa sınırında görevlerin eksik/yanlış gelmesine yol
    // açar. Bu yüzden önce filtrelenmiş görev ID'lerini join YAPMADAN
    // sayfalıyoruz, sonra o ID'ler için ilişkileri (subtasks dahil) ayrı bir
    // sorguda tam olarak çekiyoruz.
    const idQb = this.tasksRepo
      .createQueryBuilder('task')
      .leftJoin('task.intern', 'intern')
      .leftJoin('intern.user', 'user')
      .select('task.id', 'id')
      .addOrderBy('task.createdAt', 'DESC');

    if (search) {
      idQb.andWhere(
        '(LOWER(task.title) LIKE :s OR LOWER(task.description) LIKE :s OR LOWER(user.name) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }
    if (status) idQb.andWhere('task.status = :status', { status });
    if (priority) idQb.andWhere('task.priority = :priority', { priority });
    if (departmentId) idQb.andWhere('task.departmentId = :departmentId', { departmentId });
    if (internId) idQb.andWhere('task.internId = :internId', { internId });
    // Sadece stajyerin KENDİ "Görevlerim" ekranı bu bayrağı gönderir; Haftalık
    // Plan (stajyer + yönetici) ve İş Takip Listesi göndermediği için
    // gizlenmiş görevler oralarda görünmeye devam eder.
    if (excludeHidden) idQb.andWhere('task.hiddenFromInternAt IS NULL');

    const total = await idQb.getCount();
    const idRows = await idQb.offset((page - 1) * limit).limit(limit).getRawMany();
    const ids: string[] = idRows.map((r) => r.id);

    const data = ids.length
      ? await this.getBaseQuery().andWhere('task.id IN (:...ids)', { ids }).getMany()
      : [];
    // idQb'nin belirlediği sırayı koru (join'li ikinci sorgu sırayı karıştırabilir)
    const orderMap = new Map(ids.map((id, i) => [id, i]));
    data.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    return {
      data: data.map((t) => ({
        ...t,
        isOverdue: t.isOverdue,
        // Bölüm bilgisi: task.department yoksa intern.department'tan al
        department: t.department || (t.intern as any)?.department,
      })),
      total, page, limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<any> {
    const task = await this.getBaseQuery()
      .where('task.id = :id', { id })
      .getOne();
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    return {
      ...task,
      isOverdue: task.isOverdue,
      department: task.department || (task.intern as any)?.department,
    };
  }


  async updateStatus(id: string, status: string, progress: number | undefined, internId?: string): Promise<any> {
    const task = await this.findById(id);
    // internId kontrolü — stajyer sadece kendi görevini güncelleyebilir
    if (internId && (task.intern as any)?.id !== internId) {
      throw new Error('Bu görevi güncelleme yetkiniz yok.');
    }
    const updateData: any = { status };
    if (progress !== undefined) {
      updateData.progress = progress;
      // Yüzdeye + teslim tarihine göre durumu otomatik senkronize et —
      // tarih geçmişse görev Devam Ediyor yerine Gecikmiş olur; checkbox
      // geri alındığında da Tamamlandı'da takılı kalmaz.
      updateData.status = computeTaskStatus(progress, task.dueDate, status);
    }
    if (status === 'Tamamlandı') updateData.progress = 100;

    await this.tasksRepo.createQueryBuilder()
      .update(TaskEntity).set(updateData).where('id = :id', { id }).execute();
    return this.findById(id);
  }
  async update(id: string, dto: UpdateTaskDto): Promise<any> {
    // Bildirim için "önce" durumunu kaydediyoruz — sadece ANLAMLI alanlar
    // (son tarih, öncelik, checklist İÇERİĞİ) değiştiyse stajyere bildirim
    // gidecek; başlık/açıklama gibi kozmetik düzenlemelerde gitmeyecek,
    // aksi halde her küçük düzeltmede gereksiz bildirim gürültüsü olurdu.
    const before = await this.tasksRepo.findOne({ where: { id }, relations: ['subtasks'] });
    const beforeSubtaskTitles = (before?.subtasks || []).map((s) => s.title.trim()).sort();

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.internId !== undefined) updateData.internId = dto.internId;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.progress !== undefined) updateData.progress = dto.progress;
    // NOT: Bu alan önceden burada HİÇ kopyalanmıyordu — TaskModal'da bir
    // "Başlangıç Tarihi" input'u da olmadığı için fark edilmiyordu. Artık
    // hem input eklendi hem burada işleniyor; null gönderilirse (kullanıcı
    // alanı boşalttıysa) başlangıç tarihi temizlenir.
    if (dto.taskStartDate !== undefined) updateData.taskStartDate = dto.taskStartDate;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;

    // Alt görevler (checklist) — yönetici bir görevi düzenlerken checklist'i
    // değiştirebilir. Önceden UpdateTaskDto'da bu alan yoktu ve istek
    // whitelist:true/forbidNonWhitelisted:true nedeniyle ya sessizce
    // yok sayılıyor ya da 400 hatası veriyordu; alt görevler hiç
    // güncellenmiyordu. Başlıkları konuma göre eşleştirip stajyerin mevcut
    // işaretleme durumunu (isCompleted) koruyoruz, sadece gerçekten
    // silinen/eklenen satırları değiştiriyoruz.
    let afterSubtaskTitles = beforeSubtaskTitles;
    if (dto.subtasks !== undefined) {
      const titles = dto.subtasks.map((s) => s.title).filter((t) => t && t.trim());
      const synced = await this.subTasksService.syncForTask(id, titles);
      afterSubtaskTitles = synced.map((s) => s.title.trim()).sort();
      const completed = synced.filter((s) => s.isCompleted).length;
      updateData.progress = synced.length ? Math.round((completed / synced.length) * 100) : (dto.progress ?? 0);
      if (dto.status === undefined) {
        updateData.status = computeTaskStatus(updateData.progress, dto.dueDate ?? (await this.tasksRepo.findOne({ where: { id } }))?.dueDate ?? null);
      }
    }

    if (Object.keys(updateData).length) {
      await this.tasksRepo
        .createQueryBuilder()
        .update(TaskEntity)
        .set(updateData)
        .where('id = :id', { id })
        .execute();
    }

    const full = await this.findById(id);

    // Anlamlı değişiklik var mı — son tarih, öncelik ya da checklist
    // İÇERİĞİ (madde eklendi/çıkarıldı/yeniden adlandırıldı; sadece bir
    // maddenin işaretlenmesi/kaldırılması BU listede değişiklik yaratmaz,
    // çünkü o zaten stajyerin kendi eylemi).
    const dueDateChanged = dto.dueDate !== undefined
      && before?.dueDate
      && new Date(before.dueDate).toISOString().split('T')[0] !== new Date(dto.dueDate).toISOString().split('T')[0];
    const priorityChanged = dto.priority !== undefined && before?.priority !== dto.priority;
    const subtasksChanged = JSON.stringify(beforeSubtaskTitles) !== JSON.stringify(afterSubtaskTitles);
    const meaningfulChange = dueDateChanged || priorityChanged || subtasksChanged;

    const intern = full.intern as any;
    const internUserId = intern?.userId || intern?.user?.id;
    if (meaningfulChange && internUserId) {
      const parts: string[] = [];
      if (dueDateChanged) parts.push(`son tarih ${new Date(full.dueDate).toLocaleDateString('tr-TR')} olarak güncellendi`);
      if (priorityChanged) parts.push(`öncelik "${full.priority}" olarak değişti`);
      if (subtasksChanged) parts.push('görev listesi güncellendi');
      this.notifications
        .createForUsers({
          userIds: [internUserId],
          type: 'task_updated',
          title: `📝 Görev güncellendi: ${full.title}`,
          message: parts.join(', ') + '.',
          link: '/stajyer/dashboard/gorevler',
        })
        .catch(() => undefined);
    }

    return full;
  }

  // requesterInternId verildiğinde (stajyer isteği), görev o stajyere ait
  // değilse silme reddedilir. undefined ise (yönetici/mentör isteği) kontrol
  // atlanır.
  async remove(id: string, requesterInternId?: string): Promise<{ message: string }> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    if (requesterInternId !== undefined && task.internId !== requesterInternId) {
      throw new ForbiddenException('Bu görevi silme yetkiniz yok.');
    }
    await this.tasksRepo
      .createQueryBuilder()
      .delete()
      .from(TaskEntity)
      .where('id = :id', { id })
      .execute();
    return { message: 'Görev silindi.' };
  }

  // Stajyerin tamamladığı bir görevi KENDİ "Görevlerim" ekranından
  // kaldırması — gerçek bir silme DEĞİLDİR. Görev veritabanında kalır;
  // Haftalık Plan (stajyer + yönetici) ve İş Takip Listesi'nde görünmeye
  // devam eder. Sadece bu stajyerin excludeHidden=true ile çektiği
  // "Görevlerim" listesinden filtrelenir. Yalnızca tamamlanmış görevler
  // için izin verilir — devam eden bir görev "kalabalık" sayılmaz, yanlışlıkla
  // gizlenip unutulmasın diye.
  async hideForIntern(id: string, requesterInternId: string): Promise<{ message: string }> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    if (task.internId !== requesterInternId) {
      throw new ForbiddenException('Bu görevi kaldırma yetkiniz yok.');
    }
    if (task.status !== TaskStatus.COMPLETED) {
      throw new ForbiddenException('Sadece tamamlanmış görevler listenizden kaldırılabilir.');
    }
    await this.tasksRepo
      .createQueryBuilder()
      .update(TaskEntity)
      .set({ hiddenFromInternAt: new Date() })
      .where('id = :id', { id })
      .execute();
    return { message: 'Görev listenizden kaldırıldı.' };
  }

  async getStatusDistribution() {
    const result = await this.tasksRepo
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const total = result.reduce((sum, r) => sum + parseInt(r.count), 0);
    const colorMap: Record<string, string> = {
      'Tamamlandı': '#22C55E', 'Devam Ediyor': '#F97316',
      'Beklemede': '#9333EA', 'Gecikmiş': '#EF4444', 'Planlandı': '#9CA3AF',
    };
    return result.map((r) => ({
      label: r.status, count: parseInt(r.count),
      pct: total ? Math.round((parseInt(r.count) / total) * 100) : 0,
      color: colorMap[r.status] || '#9CA3AF',
    }));
  }

  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [total, completed, inProgress, delayed, dueSoon] = await Promise.all([
      this.tasksRepo.count(),
      this.tasksRepo.count({ where: { status: TaskStatus.COMPLETED } }),
      this.tasksRepo.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.tasksRepo.createQueryBuilder('t')
        .where('t.status != :s', { s: TaskStatus.COMPLETED })
        .andWhere('t.dueDate < :today', { today }).getCount(),
      this.tasksRepo.createQueryBuilder('t')
        .where('t.status != :s', { s: TaskStatus.COMPLETED })
        .andWhere('t.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek }).getCount(),
    ]);

    const avgRes = await this.tasksRepo.createQueryBuilder('t')
      .select('AVG(t.progress)', 'avg').getRawOne();

    return {
      total, completed, inProgress, delayed, dueSoon,
      averageProgress: Math.round(parseFloat(avgRes?.avg || '0')),
    };
  }

  async getCompletionTrend() {
    const raw = await this.tasksRepo
      .createQueryBuilder('task')
      .select("DATE_TRUNC('day', task.updatedAt)", 'date')
      .addSelect('COUNT(*)', 'value')
      .where('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere("task.updatedAt >= NOW() - INTERVAL '14 days'")
      .groupBy("DATE_TRUNC('day', task.updatedAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Sadece tamamlama OLAN günler dönerse grafik tek noktaya düşüp anlamsız
    // görünüyordu. Son 14 günün tamamını üretip boş günleri 0 ile dolduruyoruz
    // ki çizgi grafik sürekli ve okunabilir olsun.
    const byDay = new Map<string, number>();
    for (const r of raw) {
      const key = new Date(r.date).toISOString().slice(0, 10);
      byDay.set(key, Number(r.value) || 0);
    }
    const series: { date: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, value: byDay.get(key) ?? 0 });
    }
    return series;
  }

  async getInternProgress() {
    return this.tasksRepo
      .createQueryBuilder('task')
      .leftJoin('task.intern', 'intern')
      .leftJoin('intern.user', 'user')
      .select('intern.id', 'internId')
      .addSelect('user.name', 'name')
      .addSelect('AVG(task.progress)', 'progress')
      .groupBy('intern.id').addGroupBy('user.name')
      .orderBy('progress', 'DESC')
      .limit(10)
      .getRawMany();
  }

  async getRecentActivities(limit = 10) {
    const tasks = await this.getBaseQuery()
      .addOrderBy('task.updatedAt', 'DESC')
      .take(limit)
      .getMany();

    return tasks.map((t) => {
      let type: 'green' | 'orange' | 'red' = 'orange';
      if (t.status === TaskStatus.COMPLETED) type = 'green';
      else if (t.status === TaskStatus.DELAYED || t.isOverdue) type = 'red';
      return {
        id: t.id, type,
        // NOT: Önceden burada görev başlığı doğrudan bir HTML string'inin
        // (<strong>${t.title}</strong>...) içine gömülüyor ve frontend bunu
        // dangerouslySetInnerHTML ile DOM'a basıyordu — bir kullanıcı görev
        // başlığına <script>/<img onerror=...> gibi kod yazarsa, Ana Sayfa'yı
        // açan HERKESİN tarayıcısında çalışırdı (stored XSS). Artık düz metin
        // dönüyor; başlığın kalın gösterilmesi frontend'de JSX ile (React'in
        // kendi otomatik escape'i sayesinde güvenli) yapılıyor.
        statusText: t.status === TaskStatus.COMPLETED ? 'tamamlandı' : 'güncellendi',
        internName: (t.intern as any)?.user?.name || '',
        taskTitle: t.title,
        createdAt: t.updatedAt,
      };
    });
  }

  // NOT: Önceden bu metod sadece "en yakın N görev" döndürüyordu (tarih
  // aralığı sınırı yoktu) — ama Ana Sayfa'da "Bu Hafta Bitecek Görevler"
  // başlığıyla gösteriliyordu ve hemen yanındaki KPI kartı ("Bu Hafta
  // Teslim") getDashboardStats()'teki 7 günlük pencereyi kullanıyordu. Bu
  // ikisi farklı tanımlar kullandığı için sayı ile liste birbirini
  // tutmuyordu (örn. KPI "5" derken listede 2-3 hafta sonrasına ait görevler
  // görünebiliyordu). Artık ikisi de AYNI 7 günlük pencereyi kullanıyor.
  async getUpcomingDeadlines(limit = 5) {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getBaseQuery()
      .where('task.status != :s', { s: TaskStatus.COMPLETED })
      .andWhere('task.dueDate BETWEEN :today AND :nextWeek', { today, nextWeek })
      .addOrderBy('task.dueDate', 'ASC')
      .take(limit)
      .getMany();
  }

  // ─── Görev Yorumları ───────────────────────────────────────────────────────

  async getComments(taskId: string) {
    return this.commentsRepo.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });
  }

  // Yorum ekler ve KARŞI TARAFA bildirim düşürür: stajyer yazdıysa
  // mentöre+yöneticilere, yönetici/mentör yazdıysa stajyere.
  async addComment(
    taskId: string,
    author: { id: string; role: string; name?: string; internId?: string },
    content: string,
  ) {
    const task = await this.findById(taskId);
    // Stajyer sadece KENDİ görevine yorum yazabilir
    if (author.role === 'intern' && (task.intern as any)?.id !== author.internId) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    const comment = await this.commentsRepo.save(
      this.commentsRepo.create({ taskId, authorId: author.id, content: content.trim() }),
    );

    const intern: any = task.intern;
    const preview = content.trim().slice(0, 100);
    if (author.role === 'intern') {
      this.notifications
        .notifyMentor(intern?.id, {
          type: 'task_comment',
          title: `💬 ${author.name || 'Stajyer'} yorum yaptı: ${task.title}`,
          message: preview,
          link: '/dashboard/is-takip',
        })
        .catch(() => undefined);
    } else if (intern?.userId || intern?.user?.id) {
      this.notifications
        .createForUsers({
          userIds: [intern.userId || intern.user.id],
          type: 'task_comment',
          title: `💬 Görevinize yorum yapıldı: ${task.title}`,
          message: preview,
          link: '/stajyer/dashboard/gorevler',
        })
        .catch(() => undefined);
    }

    // Eager author ilişkisi save() dönüşünde dolu gelmeyebilir — tam halini çek
    return this.commentsRepo.findOne({ where: { id: comment.id } });
  }
}
