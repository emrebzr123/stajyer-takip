import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { SubTaskEntity } from '../subtasks/subtask.entity';
import { TaskPriority, TaskStatus } from '../shared-types';
import { InternEntity } from '../interns/intern.entity';
import { DepartmentEntity } from '../departments/department.entity';

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => InternEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'intern_id' })
  intern: InternEntity;

  @Column({ name: 'intern_id' })
  internId: string;

  @ManyToOne(() => DepartmentEntity, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: DepartmentEntity;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PLANNED })
  status: TaskStatus;

  @OneToMany(() => SubTaskEntity, (s) => s.task, { cascade: true, eager: true })
  subtasks: SubTaskEntity[];

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'date', nullable: true })
  taskStartDate: string;   // Görev başlangıç tarihi

  @Column({ type: 'date' })
  dueDate: string;         // Görev bitiş/teslim tarihi

  // Stajyer, tamamladığı bir görevi kendi "Görevlerim" ekranında kalabalık
  // yapmasın diye "sildiğinde" görev GERÇEKTEN silinmez — sadece bu alan
  // doldurulur. Haftalık Plan (hem stajyer hem yönetici) ve İş Takip Listesi
  // bu alana bakmaz, görevi göstermeye devam eder; sadece stajyerin kendi
  // "Görevlerim" listesinden (excludeHidden=true isteğiyle) filtrelenir.
  @Column({ type: 'timestamp', nullable: true })
  hiddenFromInternAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isOverdue(): boolean {
    return (
      this.status !== TaskStatus.COMPLETED &&
      new Date(this.dueDate) < new Date()
    );
  }
}
