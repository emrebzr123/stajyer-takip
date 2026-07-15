import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { PersonnelTaskBoardEntity } from './personnel-task-board.entity';

@Entity('personnel_task_items')
export class PersonnelTaskItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PersonnelTaskBoardEntity, (b) => b.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: PersonnelTaskBoardEntity;

  @Index()
  @Column({ name: 'board_id' })
  boardId: string;

  @Column()
  title: string;

  @Column({ default: 'Orta' })
  priority: string; // 'Yüksek' | 'Orta' | 'Düşük'

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
