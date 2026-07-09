import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from '../users/user.entity';

// Görev üzerinde iki yönlü iletişim: stajyer soru/durum notu yazar,
// mentör/yönetici geri bildirim verir. Her yeni yorum karşı tarafa
// uygulama içi bildirim düşürür.
@Entity('task_comments')
export class TaskCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @Index()
  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @Column({ name: 'author_id', nullable: true })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
