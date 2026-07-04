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

  @CreateDateColumn()
  createdAt: Date;
}
