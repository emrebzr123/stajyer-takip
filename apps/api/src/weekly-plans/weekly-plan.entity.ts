import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { InternEntity } from '../interns/intern.entity';
import { WeeklyPlanTaskEntity } from './weekly-plan-task.entity';

@Entity('weekly_plans')
export class WeeklyPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InternEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'intern_id' })
  intern: InternEntity;

  @Column({ name: 'intern_id' })
  internId: string;

  @Column({ type: 'int' })
  weekNumber: number;

  @Column({ type: 'date' })
  weekStartDate: string;

  @OneToMany(() => WeeklyPlanTaskEntity, (t) => t.plan, { cascade: true, eager: true })
  tasks: WeeklyPlanTaskEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
