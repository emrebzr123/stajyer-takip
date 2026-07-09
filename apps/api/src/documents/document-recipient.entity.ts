import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { DocumentEntity } from './document.entity';
import { InternEntity } from '../interns/intern.entity';

// Yöneticinin bir belgeyi BELİRLİ stajyerlerle paylaştığı durumları tutar.
// "Tüm stajyerler" ile paylaşımda bu tablo kullanılmaz — DocumentEntity.
// sharedWithAll = true yeterlidir (yeni katılan stajyerler de otomatik görür).
@Entity('document_recipients')
export class DocumentRecipientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;

  @Index()
  @Column({ name: 'document_id' })
  documentId: string;

  @ManyToOne(() => InternEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'intern_id' })
  intern: InternEntity;

  @Index()
  @Column({ name: 'intern_id' })
  internId: string;

  @CreateDateColumn()
  createdAt: Date;
}
