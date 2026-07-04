import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyPlanEntity } from './weekly-plan.entity';
import { WeeklyPlanTaskEntity } from './weekly-plan-task.entity';
import { CreateWeeklyPlanDto, UpdateWeeklyPlanDto } from './dto/weekly-plan.dto';
import { WeeklyTaskStatus } from '../shared-types';

@Injectable()
export class WeeklyPlansService {
  constructor(
    @InjectRepository(WeeklyPlanEntity)
    private readonly plansRepo: Repository<WeeklyPlanEntity>,
    @InjectRepository(WeeklyPlanTaskEntity)
    private readonly tasksRepo: Repository<WeeklyPlanTaskEntity>,
  ) {}

  async create(dto: CreateWeeklyPlanDto): Promise<WeeklyPlanEntity> {
    const plan = this.plansRepo.create({
      internId: dto.internId,
      weekNumber: dto.weekNumber,
      weekStartDate: dto.weekStartDate,
      tasks: dto.tasks.map((t) => this.tasksRepo.create(t)),
    });
    return this.plansRepo.save(plan);
  }

  async findAll(internId?: string) {
    const qb = this.plansRepo
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.intern', 'intern')
      .leftJoinAndSelect('intern.user', 'user')
      .leftJoinAndSelect('intern.department', 'department')
      .leftJoinAndSelect('plan.tasks', 'tasks')
      .orderBy('intern.id', 'ASC')
      .addOrderBy('plan.weekNumber', 'ASC')
      .addOrderBy('tasks.orderIndex', 'ASC');

    if (internId) qb.where('plan.internId = :internId', { internId });

    const plans = await qb.getMany();

    const grouped = new Map<string, any>();
    for (const plan of plans) {
      const internKey = plan.intern.id;
      if (!grouped.has(internKey)) {
        const allTasks = plans
          .filter((p) => p.intern.id === internKey)
          .flatMap((p) => p.tasks);
        const completed = allTasks.filter(
          (t) => t.status === WeeklyTaskStatus.COMPLETED,
        ).length;
        const progress = allTasks.length
          ? Math.round((completed / allTasks.length) * 100)
          : 0;

        grouped.set(internKey, {
          internId: plan.intern.id,
          intern: {
            name: plan.intern.user?.name,
            email: plan.intern.user?.email,
            department: { name: plan.intern.department?.name },
          },
          progress,
          weeks: [],
        });
      }
      grouped.get(internKey).weeks.push({
        weekNumber: plan.weekNumber,
        weekStartDate: plan.weekStartDate,
        tasks: plan.tasks,
      });
    }

    return Array.from(grouped.values());
  }

  async findById(id: string): Promise<WeeklyPlanEntity> {
    const plan = await this.plansRepo.findOne({
      where: { id },
      relations: ['intern', 'intern.user', 'tasks'],
    });
    if (!plan) throw new NotFoundException('Haftalık plan bulunamadı.');
    return plan;
  }

  async update(id: string, dto: UpdateWeeklyPlanDto): Promise<WeeklyPlanEntity> {
    const plan = await this.findById(id);
    if (dto.tasks) {
      plan.tasks = dto.tasks.map((t) => this.tasksRepo.create(t));
    }
    return this.plansRepo.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findById(id);
    await this.plansRepo.remove(plan);
  }
}
