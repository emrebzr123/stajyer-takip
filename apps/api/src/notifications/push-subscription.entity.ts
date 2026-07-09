import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

// Bir kullanıcının bir TARAYICI/CİHAZ üzerindeki push aboneliğini tutar.
// Aynı kullanıcı birden fazla cihazdan (telefon + bilgisayar) abone
// olabileceği için userId TEKİL değildir — bir kullanıcının birden çok
// satırı olabilir. `endpoint` tarayıcı/cihaz başına biriciktir.
@Entity('push_subscriptions')
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text', unique: true })
  endpoint: string;

  @Column()
  p256dh: string;

  @Column()
  auth: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
