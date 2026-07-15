import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { UserRole } from '../shared-types';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.INTERN })
  role: UserRole;

  @Column({ nullable: true })
  avatarUrl: string;

  // Şifre sıfırlama akışı — "Şifremi Unuttum?" ile üretilen rastgele token
  // ve son geçerlilik zamanı. select:false — normal sorgularda asla geri
  // dönmez, sadece özel olarak seçildiğinde (auth akışında) erişilir.
  @Column({ nullable: true, select: false })
  passwordResetToken: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  passwordResetExpires: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
