import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { AdminTaskItemEntity } from './admin-task-item.entity';

// Yönetici panelindeki KİŞİSEL "Görevlerim" panosunun bir bölümü (sütunu).
// Stajyer takip sistemindeki TaskEntity'den TAMAMEN BAĞIMSIZDIR — bu,
// bir yöneticinin kendi iş/proje takibini yaptığı özel bir Kanban panosudur;
// stajyerlerle veya departmanlarla hiçbir ilişkisi yoktur.
//
// ownerId: bu bölümü oluşturan yönetici. Her yönetici SADECE KENDİ
// bölümlerini görür — sahiplik kontrolü admin-tasks.service.ts'de her
// istekte yapılır.
@Entity('admin_task_boards')
export class AdminTaskBoardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column()
  name: string;

  // Bölüm başlığının rengi (frontend'de tema olarak kullanılır) — sabit bir
  // paletten seçilir, ör. '#7C3AED'
  @Column({ default: '#3B82F6' })
  color: string;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @OneToMany(() => AdminTaskItemEntity, (t) => t.board, { cascade: true })
  tasks: AdminTaskItemEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
