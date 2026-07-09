import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TaskEntity } from '../tasks/task.entity';

@Entity('subtasks')
export class SubTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ default: false })
  isCompleted: boolean;

  @ManyToOne(() => TaskEntity, (task) => task.subtasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @Column({ name: 'task_id' })
  taskId: string;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;
}
