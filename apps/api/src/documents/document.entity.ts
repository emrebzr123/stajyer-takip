import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  mimeType: string;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: UserEntity;

  @Column({ nullable: true })
  internId: string;

  @Column({ nullable: true })
  taskId: string;

  // Yönetici bir belgeyi TÜM stajyerlerle paylaştığında true olur. Belirli
  // stajyerlerle paylaşıldıysa bunun yerine DocumentRecipientEntity satırları
  // kullanılır (bkz. document-recipient.entity.ts).
  @Column({ default: false })
  sharedWithAll: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
