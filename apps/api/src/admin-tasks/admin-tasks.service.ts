import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminTaskBoardEntity } from './admin-task-board.entity';
import { AdminTaskItemEntity } from './admin-task-item.entity';
import { CreateBoardDto, UpdateBoardDto, CreateTaskItemDto, UpdateTaskItemDto } from './dto/admin-task.dto';

const DEFAULT_COLORS = ['#7C3AED', '#059669', '#EA580C', '#2563EB', '#DB2777', '#0891B2'];

@Injectable()
export class AdminTasksService {
  constructor(
    @InjectRepository(AdminTaskBoardEntity)
    private readonly boardsRepo: Repository<AdminTaskBoardEntity>,
    @InjectRepository(AdminTaskItemEntity)
    private readonly itemsRepo: Repository<AdminTaskItemEntity>,
  ) {}

  // Sadece giriş yapan yöneticinin KENDİ bölümlerini (ve içindeki görevleri)
  // döner — başka bir yöneticinin panosu asla görünmez.
  async findBoardsForOwner(ownerId: string) {
    return this.boardsRepo.find({
      where: { ownerId },
      relations: ['tasks'],
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });
  }

  async createBoard(ownerId: string, dto: CreateBoardDto) {
    const count = await this.boardsRepo.count({ where: { ownerId } });
    const board = this.boardsRepo.create({
      ownerId,
      name: dto.name.trim(),
      color: dto.color || DEFAULT_COLORS[count % DEFAULT_COLORS.length],
      orderIndex: count,
    });
    return this.boardsRepo.save(board);
  }

  // Bölümün gerçekten bu kullanıcıya ait olduğunu doğrular; değilse
  // NotFoundException fırlatır (403 yerine 404 — başka birinin bölümünün
  // VAR OLDUĞUNU bile sızdırmamak için).
  private async getOwnedBoard(id: string, ownerId: string): Promise<AdminTaskBoardEntity> {
    const board = await this.boardsRepo.findOne({ where: { id } });
    if (!board || board.ownerId !== ownerId) {
      throw new NotFoundException('Bölüm bulunamadı.');
    }
    return board;
  }

  async updateBoard(id: string, ownerId: string, dto: UpdateBoardDto) {
    const board = await this.getOwnedBoard(id, ownerId);
    if (dto.name !== undefined) board.name = dto.name.trim();
    if (dto.color !== undefined) board.color = dto.color;
    if (dto.orderIndex !== undefined) board.orderIndex = dto.orderIndex;
    return this.boardsRepo.save(board);
  }

  async removeBoard(id: string, ownerId: string) {
    const board = await this.getOwnedBoard(id, ownerId);
    await this.boardsRepo.remove(board);
    return { message: 'Bölüm silindi.' };
  }

  // Görevin, sahibi doğrulanmış bir bölüme ait olduğunu kontrol eder.
  private async getOwnedTask(id: string, ownerId: string): Promise<AdminTaskItemEntity> {
    const task = await this.itemsRepo.findOne({ where: { id }, relations: ['board'] });
    if (!task || task.board?.ownerId !== ownerId) {
      throw new NotFoundException('Görev bulunamadı.');
    }
    return task;
  }

  async createTask(boardId: string, ownerId: string, dto: CreateTaskItemDto) {
    // Bölüm sahiplik kontrolü — başka birinin bölümüne görev eklenemez
    await this.getOwnedBoard(boardId, ownerId);
    const count = await this.itemsRepo.count({ where: { boardId } });
    const task = this.itemsRepo.create({
      boardId,
      title: dto.title.trim(),
      priority: dto.priority || 'Orta',
      dueDate: dto.dueDate,
      orderIndex: count,
    });
    return this.itemsRepo.save(task);
  }

  async updateTask(id: string, ownerId: string, dto: UpdateTaskItemDto) {
    const task = await this.getOwnedTask(id, ownerId);
    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate;
    if (dto.isCompleted !== undefined) task.isCompleted = dto.isCompleted;
    return this.itemsRepo.save(task);
  }

  async removeTask(id: string, ownerId: string) {
    const task = await this.getOwnedTask(id, ownerId);
    await this.itemsRepo.remove(task);
    return { message: 'Görev silindi.' };
  }

  // Bir bölümdeki TÜM tamamlanmış görevleri tek seferde siler
  // ("Tamamlananları Sil" butonu).
  async clearCompleted(boardId: string, ownerId: string) {
    await this.getOwnedBoard(boardId, ownerId); // sahiplik kontrolü
    const result = await this.itemsRepo.delete({ boardId, isCompleted: true });
    return { message: `${result.affected || 0} görev silindi.`, count: result.affected || 0 };
  }

  // Birden fazla bölümü tek seferde siler (toplu seçim). Sahip olunmayan
  // ID'ler sessizce yok sayılır — bir yönetici asla başka birinin bölümünü
  // bu yoldan silemez.
  async removeBoards(ids: string[], ownerId: string) {
    const boards = await this.boardsRepo.find({ where: { ownerId } });
    const ownedIds = new Set(boards.map((b) => b.id));
    const toDelete = boards.filter((b) => ids.includes(b.id) && ownedIds.has(b.id));
    if (!toDelete.length) return { message: '0 bölüm silindi.', count: 0 };
    await this.boardsRepo.remove(toDelete);
    return { message: `${toDelete.length} bölüm silindi.`, count: toDelete.length };
  }
}
