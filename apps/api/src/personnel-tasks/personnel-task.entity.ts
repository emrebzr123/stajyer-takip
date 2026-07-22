import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

// Yönetici (admin) tarafından bir Personel'e (manager) atanan görev.
// Stajyer görev sisteminden (TaskEntity) TAMAMEN BAĞIMSIZDIR — bir üst
// kademedeki, Yönetici → Personel görev atamasını temsil eder.
//
// Görünürlük kuralı: SADECE atanan Personel (assignedTo) ve atayan
// Yönetici (assignedBy/admin genel olarak) görebilir — başka bir Personel
// ya da stajyer bu görevi hiç görmez.
@Entity('personnel_tasks')
export class PersonnelTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'Orta' })
  priority: string; // 'Yüksek' | 'Orta' | 'Düşük'

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ default: false })
  isCompleted: boolean;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: UserEntity;

  @Index()
  @Column({ name: 'assigned_to_id' })
  assignedToId: string;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: UserEntity;

  @Column({ name: 'assigned_by_id' })
  assignedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
