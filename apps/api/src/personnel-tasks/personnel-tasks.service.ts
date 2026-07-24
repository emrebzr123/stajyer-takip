import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonnelTaskBoardEntity } from './personnel-task-board.entity';
import { PersonnelTaskItemEntity } from './personnel-task-item.entity';
import {
  CreatePersonnelBoardDto, UpdatePersonnelBoardDto,
  CreatePersonnelTaskItemDto, UpdatePersonnelTaskItemDto,
} from './dto/personnel-task.dto';
import { AppNotificationsService } from '../notifications/app-notifications.service';
// "Görev Aktar" ile bir alt görevden aktarılan stajyer alt görevini, kaynak
// alt görev burada (Personel/Yönetici tarafından) elle işaretlendiğinde de
// senkron tutmak için — bkz. syncTransferredSubtask. SubTasksService'in
// kendi toggle() metodunu çağırıyoruz ki görevin GENEL ilerlemesi
// (progress/status) de doğru yeniden hesaplansın — bu mantığı burada
// tekrarlamamak için.
import { SubTaskEntity } from '../subtasks/subtask.entity';
import { SubTasksService } from '../subtasks/subtasks.service';

const DEFAULT_COLORS = ['#1E3A5F', '#0F6E6E', '#7C3AED', '#EA580C', '#DB2777', '#059669'];

@Injectable()
export class PersonnelTasksService {
  constructor(
    @InjectRepository(PersonnelTaskBoardEntity)
    private readonly boardsRepo: Repository<PersonnelTaskBoardEntity>,
    @InjectRepository(PersonnelTaskItemEntity)
    private readonly itemsRepo: Repository<PersonnelTaskItemEntity>,
    @InjectRepository(SubTaskEntity)
    private readonly subtasksRepo: Repository<SubTaskEntity>,
    private readonly subTasksService: SubTasksService,
    private readonly notifications: AppNotificationsService,
  ) {}

  // Bu alt görevden "Görev Aktar" ile oluşturulmuş bir stajyer alt görevi
  // varsa (sourcePersonnelTaskItemId ile işaretli), onun da tamamlanma
  // durumunu buradaki değişiklikle senkron tutar — ÇİFT YÖNLÜ
  // senkronizasyonun ikinci yönü (subtasks.service.ts'deki toggle()'ın
  // simetriği). Aktarılmamış bir alt görevde hiçbir eşleşme bulunamaz,
  // sessizce hiçbir şey yapmaz.
  private async syncTransferredSubtask(personnelTaskItemId: string, isCompleted: boolean) {
    const subtask = await this.subtasksRepo.findOne({ where: { sourcePersonnelTaskItemId: personnelTaskItemId } });
    if (!subtask) return;
    // toggle() zaten hem alt görevi işaretliyor hem bağlı olduğu görevin
    // genel ilerlemesini yeniden hesaplıyor — requesterInternId=undefined
    // (bu istek Personel/Yönetici'den geliyor, stajyer yetki kontrolü
    // atlanır, zaten controller seviyesinde @Roles korumalı).
    await this.subTasksService.toggle(subtask.id, isCompleted);
  }

  // Yönetici — belirli bir Personel için oluşturulmuş bölümleri görür.
  // requesterAdminId VERİLDİYSE (yani bu bir Yönetici isteğiyse), o
  // Yönetici'nin hiddenFromAdminIds listesinde olduğu board'lar sonuçtan
  // ÇIKARILIR. Personel'in kendi görünümünde (findMyBoards) bu parametre
  // hiç verilmiyor — Personel her zaman kendisine atanan TÜM işleri görür,
  // bu kısıtlama sadece admin-admin arası görünürlük içindir.
  async findBoardsFor(assignedToId: string, requesterAdminId?: string) {
    const boards = await this.boardsRepo.find({
      where: { assignedToId },
      relations: ['tasks'],
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });
    if (!requesterAdminId) return boards;
    // NOT: Önceden burada "createdById === requesterAdminId" istisnası
    // YOKTU — koddaki yorum "oluşturan sen her zaman görürsün" diyordu
    // ama gerçek filtre bunu uygulamıyordu. Sonuç: bir Yönetici, kendi
    // oluşturduğu bir projede yanlışlıkla kendi checkbox'ını kaldırırsa,
    // KENDİSİ DE o projeyi bir daha göremiyordu — kendi oluşturduğu işi
    // kaybetmiş gibi oluyordu. Artık oluşturan kişi bu kısıtlamadan HER
    // ZAMAN muaf.
    return boards.filter((b) => b.createdById === requesterAdminId || !b.hiddenFromAdminIds?.includes(requesterAdminId));
  }

  // Personel — SADECE kendisine ait bölümleri görür (kendi "Görevlerim"
  // sayfasında).
  async findMyBoards(myUserId: string) {
    return this.findBoardsFor(myUserId);
  }

  async createBoard(createdById: string, dto: CreatePersonnelBoardDto) {
    const count = await this.boardsRepo.count({ where: { assignedToId: dto.assignedToId } });
    const board = this.boardsRepo.create({
      assignedToId: dto.assignedToId,
      createdById,
      name: dto.name.trim(),
      color: dto.color || DEFAULT_COLORS[count % DEFAULT_COLORS.length],
      orderIndex: count,
      companyId: dto.companyId || undefined,
      dueDate: dto.dueDate || undefined,
      hiddenFromAdminIds: dto.hiddenFromAdminIds?.length ? dto.hiddenFromAdminIds : undefined,
    });
    const saved = await this.boardsRepo.save(board);

    // NOT: Bu bildirim önceden HİÇ gönderilmiyordu — Yönetici bir Personel'e
    // yeni proje açtığında Personel bundan habersiz kalıyordu, ancak kendi
    // "Görevlerim" sayfasına manuel bakınca fark edebiliyordu. Artık
    // oluşturulduğu an bildirim gidiyor.
    this.notifications
      .createForUsers({
        userIds: [dto.assignedToId],
        type: 'personnel_board_assigned',
        title: `📁 Size yeni bir proje atandı: ${saved.name}`,
        message: 'Görevlerim sayfanızdan projenin detaylarını görebilirsiniz.',
        link: '/dashboard/gorevlerim',
      })
      .catch(() => undefined);

    return saved;
  }

  private async getBoard(id: string): Promise<PersonnelTaskBoardEntity> {
    const board = await this.boardsRepo.findOne({ where: { id } });
    if (!board) throw new NotFoundException('Bölüm bulunamadı.');
    return board;
  }

  // Bölüm CRUD'u (oluşturma/düzenleme/silme) sadece Yönetici'ye ait —
  // Personel bu bölümleri sadece görüntüler ve içindeki görevleri
  // tamamlandı işaretler.
  async updateBoard(id: string, dto: UpdatePersonnelBoardDto) {
    const board = await this.getBoard(id);
    if (dto.name !== undefined) board.name = dto.name.trim();
    if (dto.color !== undefined) board.color = dto.color;
    if (dto.orderIndex !== undefined) board.orderIndex = dto.orderIndex;
    if (dto.dueDate !== undefined) board.dueDate = dto.dueDate;
    if (dto.hiddenFromAdminIds !== undefined) board.hiddenFromAdminIds = dto.hiddenFromAdminIds;
    return this.boardsRepo.save(board);
  }

  async removeBoard(id: string) {
    const board = await this.getBoard(id);
    await this.boardsRepo.remove(board);
    return { message: 'Bölüm silindi.' };
  }

  async removeBoards(ids: string[]) {
    const boards = await this.boardsRepo.find({ where: ids.map((id) => ({ id })) });
    if (!boards.length) return { message: '0 bölüm silindi.', count: 0 };
    await this.boardsRepo.remove(boards);
    return { message: `${boards.length} bölüm silindi.`, count: boards.length };
  }

  async createTask(boardId: string, dto: CreatePersonnelTaskItemDto) {
    const board = await this.getBoard(boardId); // varlık kontrolü + bildirim için lazım
    const count = await this.itemsRepo.count({ where: { boardId } });
    const task = this.itemsRepo.create({
      boardId,
      title: dto.title.trim(),
      priority: dto.priority || 'Orta',
      dueDate: dto.dueDate,
      orderIndex: count,
    });
    const saved = await this.itemsRepo.save(task);

    // NOT: Bu bildirim de HİÇ gönderilmiyordu — aynı eksik. Yönetici bir
    // projeye yeni görev eklediğinde artık Personel'e anında haber gidiyor.
    this.notifications
      .createForUsers({
        userIds: [board.assignedToId],
        type: 'personnel_task_assigned',
        title: `📋 Yeni görev: ${saved.title}`,
        message: `"${board.name}" projenize yeni bir görev eklendi.`,
        link: '/dashboard/gorevlerim',
      })
      .catch(() => undefined);

    return saved;
  }

  private async getOwnedTask(id: string, requesterId: string, requesterRole: string): Promise<PersonnelTaskItemEntity> {
    const task = await this.itemsRepo.findOne({ where: { id }, relations: ['board'] });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    // Sadece bölümün ait olduğu Personel (kendi görevi) ya da bir admin
    // erişebilir/güncelleyebilir.
    if (task.board?.assignedToId !== requesterId && requesterRole !== 'admin') {
      throw new ForbiddenException('Bu göreve erişim yetkiniz yok.');
    }
    return task;
  }

  async updateTask(id: string, requesterId: string, requesterRole: string, dto: UpdatePersonnelTaskItemDto) {
    const task = await this.getOwnedTask(id, requesterId, requesterRole);
    const wasCompleted = task.isCompleted;

    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate;
    if (dto.isCompleted !== undefined) task.isCompleted = dto.isCompleted;

    const saved = await this.itemsRepo.save(task);

    // Personel görevi TAMAMLADIĞINDA, SADECE bölümü oluşturan Yönetici'ye
    // bildirim gider.
    if (!wasCompleted && saved.isCompleted && task.board) {
      this.notifications
        .createForUsers({
          userIds: [task.board.createdById],
          type: 'personnel_task_completed',
          title: `✅ Görev tamamlandı: ${saved.title}`,
          message: `"${task.board.name}" bölümündeki bir görev tamamlandı.`,
          // NOT: Önceden '/yonetici/dashboard/personel' idi — o sayfa artık
          // sadece personel yönetimi (ekle/sil/rol) yapıyor, proje/görev
          // detayları "Görevler" sayfasına taşındı. Link güncellendi,
          // ayrıca ilgili personel doğrudan seçili gelsin diye personelId
          // de ekleniyor (bkz. Ana Sayfa'daki aynı desen).
          link: `/yonetici/dashboard/gorevler?personelId=${task.board.assignedToId}`,
        })
        .catch(() => undefined);
    }

    // Bu alt görev, aktarılmış bir stajyer görevinin kaynağıysa (ÇİFT
    // YÖNLÜ senkronizasyonun ikinci yönü) — sadece isCompleted GERÇEKTEN
    // değiştiyse gereksiz sorgu atmayalım.
    if (dto.isCompleted !== undefined && wasCompleted !== saved.isCompleted) {
      await this.syncTransferredSubtask(id, saved.isCompleted).catch(() => undefined);
    }

    return saved;
  }

  async removeTask(id: string) {
    const task = await this.itemsRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    await this.itemsRepo.remove(task);
    return { message: 'Görev silindi.' };
  }

  // Bir bölümdeki TÜM tamamlanmış görevleri tek seferde siler.
  async clearCompleted(boardId: string) {
    await this.getBoard(boardId);
    const result = await this.itemsRepo.delete({ boardId, isCompleted: true });
    return { message: `${result.affected || 0} görev silindi.`, count: result.affected || 0 };
  }
}
