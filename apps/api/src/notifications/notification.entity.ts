import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

// Uygulama içi (zil ikonu) bildirimleri. E-posta bildirimlerinden bağımsızdır;
// MailService ile birlikte veya tek başına kullanılabilir.
@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Bildirimi alacak kullanıcı
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  // Bildirim türü: 'task_completed' | 'due_reminder' | 'document_uploaded' | 'general'
  @Column({ default: 'general' })
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  // Tıklanınca gidilecek uygulama içi yol (örn. /dashboard/is-takip)
  @Column({ nullable: true })
  link: string;

  @Index()
  @Column({ default: false })
  isRead: boolean;

  // Aynı bildirimin (örn. cron her çalıştığında) tekrar tekrar üretilmesini
  // önlemek için kullanılır: 'due:{taskId}:{YYYY-MM-DD}' gibi.
  @Index()
  @Column({ nullable: true })
  dedupeKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
