import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
} from 'typeorm';
import { WeeklyTaskStatus } from '../shared-types';

@Entity('weekly_plan_tasks')
export class WeeklyPlanTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: WeeklyTaskStatus, default: WeeklyTaskStatus.PLANNED })
  status: WeeklyTaskStatus;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @ManyToOne('WeeklyPlanEntity', 'tasks', { onDelete: 'CASCADE' })
  plan: any;
}
