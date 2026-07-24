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

  // "Görev Aktar" ile Personel panelindeki bir projeden/görevden bu alt
  // görev de aktarıldıysa, kaynak PersonnelTaskItem'ın ID'sini tutar —
  // stajyer bu alt görevi işaretlediğinde (ya da tersine, Personel/
  // Yönetici kaynağı işaretlediğinde), ikisi çift yönlü senkron kalsın
  // diye. Elle oluşturulan normal alt görevlerde boş kalır.
  @Column({ name: 'source_personnel_task_item_id', nullable: true })
  sourcePersonnelTaskItemId: string;
}
