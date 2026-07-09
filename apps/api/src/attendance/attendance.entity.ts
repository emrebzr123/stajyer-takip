import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InternEntity } from '../interns/intern.entity';

@Entity('attendances')
export class AttendanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InternEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'intern_id' })
  intern: InternEntity;

  @Column({ name: 'intern_id' })
  internId: string;

  @Column({ type: 'timestamp' })
  checkIn: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOut: Date;

  @Column({ type: 'int', nullable: true })
  duration: number; // dakika

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn()
  createdAt: Date;
}
