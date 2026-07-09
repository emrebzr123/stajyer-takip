import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

// Bir stajyerin, kendisiyle paylaşılan (özellikle "Tüm Stajyerler" ile
// paylaşılan) bir belgeyi KENDİ listesinden kaldırmasını sağlar. Belgenin
// kendisi silinmez — diğer alıcılar görmeye devam eder; sadece bu stajyer
// için görünürlükten çıkar. "Seçili stajyerler" paylaşımında ise silme,
// bu stajyerin DocumentRecipientEntity satırını kaldırır; bu tablo ise
// yalnızca sharedWithAll=true durumunda kullanılır (o durumda her stajyer
// için ayrı bir recipient satırı yoktur).
@Entity('document_dismissals')
export class DocumentDismissalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'document_id' })
  documentId: string;

  @Index()
  @Column({ name: 'intern_id' })
  internId: string;

  @CreateDateColumn()
  createdAt: Date;
}
