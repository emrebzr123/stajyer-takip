import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { InternStatus } from '../shared-types';
import { UserEntity } from '../users/user.entity';
import { DepartmentEntity } from '../departments/department.entity';
import { CompanyEntity } from '../companies/company.entity';

@Entity('interns')
export class InternEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id' })
  userId: string;

  // Firma
  @ManyToOne(() => CompanyEntity, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @Column({ name: 'company_id', nullable: true })
  companyId: string;

  @ManyToOne(() => DepartmentEntity, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: DepartmentEntity;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @ManyToOne(() => UserEntity, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mentor_id' })
  mentor: UserEntity;

  @Column({ name: 'mentor_id', nullable: true })
  mentorId: string;

  @Column({ nullable: true })
  term: string;

  @Column({ type: 'enum', enum: InternStatus, default: InternStatus.ACTIVE })
  status: InternStatus;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  // Yeni alanlar
  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  university: string;

  @Column({ nullable: true })
  academicDepartment: string; // Üniversite bölümü (Bilgisayar Mühendisliği vb.)

  @Column({ nullable: true })
  gpa: string;

  @Column({ nullable: true })
  tcNo: string;

  @Column({ nullable: true })
  birthDate: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  internType: string; // Yaz Stajı / Dönem İçi

  @Column({ nullable: true })
  workType: string; // Tam Zamanlı / Uzaktan / Hibrit

  @Column({ type: 'simple-array', nullable: true })
  hybridDays: string[]; // ['Pazartesi', 'Çarşamba']

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  profilePhoto: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
