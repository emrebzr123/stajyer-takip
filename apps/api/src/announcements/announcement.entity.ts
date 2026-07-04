// announcement.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { UserRole } from '../shared-types';
import { UserEntity } from '../users/user.entity';

@Entity('announcements')
export class AnnouncementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserEntity;

  @Column({ type: 'enum', enum: UserRole, nullable: true })
  targetRole: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
