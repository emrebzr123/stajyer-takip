import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { CompanyEntity } from '../companies/company.entity';
import { PersonnelTaskItemEntity } from './personnel-task-item.entity';

// Yönetici (admin) tarafından bir Personel (manager) İÇİN oluşturulan bir
// görev bölümü (Proje) — "Görevlerim" (admin-tasks) sayfasındaki kişisel
// bölüm/pano yapısıyla BİREBİR AYNI mantık, sadece iki taraflı: bölümü
// Yönetici oluşturur/yönetir (ekler/siler), Personel sadece görür ve
// içindeki görevleri tamamlandı işaretler.
@Entity('personnel_task_boards')
export class PersonnelTaskBoardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: '#1E3A5F' })
  color: string;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  // Bu bölüm HANGİ Personel için — o kişi kendi "Görevlerim" sayfasında
  // bu bölümü ve içindeki görevleri görür.
  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: UserEntity;

  @Index()
  @Column({ name: 'assigned_to_id' })
  assignedToId: string;

  // Bölümü oluşturan Yönetici — görev tamamlandığında bildirim buna gider.
  @Column({ name: 'created_by_id' })
  createdById: string;

  // Proje HANGİ şirkete ait — opsiyonel (nullable). Yönetici panelinde
  // şirkete göre filtreleme/özet için kullanılır. Mevcut CompanyEntity
  // (stajyer ekleme formundaki "Firma" alanıyla AYNI tablo) yeniden
  // kullanılıyor — sıfırdan bir şirket sistemi kurmaya gerek yoktu.
  @ManyToOne(() => CompanyEntity, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @Column({ name: 'company_id', nullable: true })
  companyId: string;

  // Bitiş tarihi — kullanıcı sadece bunu girer, başlangıç (oluşturulma)
  // zaten createdAt ile otomatik. Opsiyonel: eski kayıtlarda ya da hâlâ
  // tarihsiz oluşturulanlarda boş kalabilir.
  @Column({ type: 'date', nullable: true })
  dueDate: string;

  // Bu proje/görevi HANGİ Yöneticilerin (admin) GÖREMEYECEĞİ — varsayılan
  // (boş/null) durumda TÜM Yöneticiler görür. Bir admin ID'si buraya
  // eklenirse, o Yönetici artık bu projeyi Görevler sayfasında ve İş Takip
  // Listesi'nde görmez. NOT: Bu kısıtlama SADECE diğer Yöneticileri
  // etkiler — projenin atandığı Personel ve projeyi oluşturan Yönetici
  // her zaman görmeye devam eder (onlar zaten "hariç tutulan" listesine
  // dahil edilmez, mantıksal olarak bu ACL sadece admin-admin arası
  // görünürlük içindir).
  @Column('simple-array', { nullable: true })
  hiddenFromAdminIds: string[];

  @OneToMany(() => PersonnelTaskItemEntity, (t) => t.board, { cascade: true })
  tasks: PersonnelTaskItemEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
