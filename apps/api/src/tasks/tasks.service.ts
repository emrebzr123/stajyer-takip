import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { TaskStatus } from '../shared-types';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasksRepo: Repository<TaskEntity>,
  ) {}

  private getBaseQuery() {
    return this.tasksRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.intern', 'intern')
      .leftJoinAndSelect('intern.user', 'user')
      .leftJoinAndSelect('intern.department', 'internDept')
      .leftJoinAndSelect('task.department', 'department');
  }

  async create(dto: CreateTaskDto): Promise<any> {
    const task = this.tasksRepo.create(dto);
    const saved = await this.tasksRepo.save(task);
    return this.findById(saved.id);
  }

  async findAll(query: TaskQueryDto) {
    const { page = 1, limit = 10, search, status, priority, departmentId, internId } = query;

    const qb = this.getBaseQuery().orderBy('task.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(LOWER(task.title) LIKE :s OR LOWER(task.description) LIKE :s OR LOWER(user.name) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }
    if (status) qb.andWhere('task.status = :status', { status });
    if (priority) qb.andWhere('task.priority = :priority', { priority });
    if (departmentId) qb.andWhere('task.departmentId = :departmentId', { departmentId });
    if (internId) qb.andWhere('task.internId = :internId', { internId });

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

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

  async update(id: string, dto: UpdateTaskDto): Promise<any> {
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.internId !== undefined) updateData.internId = dto.internId;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.progress !== undefined) updateData.progress = dto.progress;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;

    await this.tasksRepo
      .createQueryBuilder()
      .update(TaskEntity)
      .set(updateData)
      .where('id = :id', { id })
      .execute();

    return this.findById(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const task = await this.tasksRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    await this.tasksRepo
      .createQueryBuilder()
      .delete()
      .from(TaskEntity)
      .where('id = :id', { id })
      .execute();
    return { message: 'Görev silindi.' };
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
    return this.tasksRepo
      .createQueryBuilder('task')
      .select("DATE_TRUNC('day', task.updatedAt)", 'date')
      .addSelect('COUNT(*)', 'value')
      .where('task.status = :status', { status: TaskStatus.COMPLETED })
      .andWhere("task.updatedAt >= NOW() - INTERVAL '30 days'")
      .groupBy("DATE_TRUNC('day', task.updatedAt)")
      .orderBy('date', 'ASC')
      .getRawMany();
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
      .orderBy('task.updatedAt', 'DESC')
      .take(limit)
      .getMany();

    return tasks.map((t) => {
      let type: 'green' | 'orange' | 'red' = 'orange';
      if (t.status === TaskStatus.COMPLETED) type = 'green';
      else if (t.status === TaskStatus.DELAYED || t.isOverdue) type = 'red';
      return {
        id: t.id, type,
        message: `<strong>${t.title}</strong> görevi ${t.status === TaskStatus.COMPLETED ? 'tamamlandı' : 'güncellendi'}.`,
        internName: (t.intern as any)?.user?.name || '',
        taskTitle: t.title,
        createdAt: t.updatedAt,
      };
    });
  }

  async getUpcomingDeadlines(limit = 5) {
    const today = new Date().toISOString().split('T')[0];
    return this.getBaseQuery()
      .where('task.status != :s', { s: TaskStatus.COMPLETED })
      .andWhere('task.dueDate >= :today', { today })
      .orderBy('task.dueDate', 'ASC')
      .take(limit)
      .getMany();
  }
}
