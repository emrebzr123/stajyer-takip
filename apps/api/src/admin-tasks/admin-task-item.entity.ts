import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { AdminTaskBoardEntity } from './admin-task-board.entity';

// NOT: Bilinçli olarak yüzdelik/dairesel bir "progress" alanı YOK. Bu
// görevler basit tikle-tamamla (checkbox) mantığındadır — alt görev/checklist
// kavramı olmadığı için bir görevin "%40 tamamlandı" gibi bir ara durumu
// anlamsızdır (ya tamamlanmıştır ya da tamamlanmamıştır). Sahte/işlevsiz bir
// yüzde göstergesi eklemek yerine bölüm başlığında GERÇEK bir "X/Y tamamlandı"
// sayacı kullanılıyor (bkz. frontend).
@Entity('admin_task_items')
export class AdminTaskItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AdminTaskBoardEntity, (b) => b.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: AdminTaskBoardEntity;

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
