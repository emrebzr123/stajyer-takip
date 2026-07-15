// documents.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentRecipientEntity } from './document-recipient.entity';
import { DocumentDismissalEntity } from './document-dismissal.entity';
import { InternEntity } from '../interns/intern.entity';
import { AppNotificationsService } from '../notifications/app-notifications.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly docsRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentRecipientEntity)
    private readonly recipientsRepo: Repository<DocumentRecipientEntity>,
    @InjectRepository(DocumentDismissalEntity)
    private readonly dismissalsRepo: Repository<DocumentDismissalEntity>,
    @InjectRepository(InternEntity)
    private readonly internsRepo: Repository<InternEntity>,
    private readonly notifications: AppNotificationsService,
  ) {}

  async create(
    file: Express.Multer.File,
    uploader: { id: string; role?: string; name?: string },
    internId?: string,
    taskId?: string,
  ) {
    // Multer, orijinal dosya adını latin1 olarak verir; Türkçe karakterli
    // dosya adları (ör. "staj_defteri_şubat.pdf") bozulmasın diye UTF-8'e çevir.
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const doc = this.docsRepo.create({
      name: originalName,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: { id: uploader.id } as any,
      internId,
      taskId,
    });
    const saved = await this.docsRepo.save(doc);

    // Stajyer belge yüklediğinde mentörüne (Personel) uygulama içi
    // bildirim düşer — Yönetici stajyer seviyesindeki bu tür olayları
    // görmez. Bildirim hatası yüklemeyi engellemez.
    if (uploader.role === 'intern' && internId) {
      this.notifications
        .notifyMentor(internId, {
          type: 'document_uploaded',
          title: `📎 Yeni belge yüklendi: ${originalName}`,
          message: `${uploader.name || 'Bir stajyer'} yeni bir belge yükledi.`,
          link: '/dashboard/belgeler',
        })
        .catch(() => undefined);
    }

    return saved;
  }

  // Yönetici bir belgeyi seçili stajyerlerle ya da TÜM stajyerlerle
  // paylaşır. shareWithAll=true ise recipientInternIds yok sayılır ve
  // her stajyer (ileride eklenenler dahil) belgeyi görür.
  async shareWithInterns(
    file: Express.Multer.File,
    uploader: { id: string; name?: string },
    recipientInternIds: string[],
    shareWithAll: boolean,
  ) {
    if (!shareWithAll && recipientInternIds.length === 0) {
      throw new ForbiddenException('En az bir stajyer seçmelisiniz ya da "Tüm Stajyerler" seçeneğini işaretleyin.');
    }

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const doc = this.docsRepo.create({
      name: originalName,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: { id: uploader.id } as any,
      internId: null as any, // stajyerin kendi yüklediği belge değil — sahibi yok
      sharedWithAll: shareWithAll,
    });
    const saved = await this.docsRepo.save(doc);

    let targetInterns: InternEntity[];
    if (shareWithAll) {
      targetInterns = await this.internsRepo.find({ relations: ['user'] });
    } else {
      await this.recipientsRepo.save(
        recipientInternIds.map((internId) => this.recipientsRepo.create({ documentId: saved.id, internId })),
      );
      targetInterns = await this.internsRepo.find({
        where: { id: In(recipientInternIds) },
        relations: ['user'],
      });
    }

    // Hedeflenen tüm stajyerlere zil bildirimi
    const userIds = targetInterns.map((i) => (i.user as any)?.id).filter(Boolean);
    if (userIds.length) {
      this.notifications
        .createForUsers({
          userIds,
          type: 'document_shared',
          title: `📎 Sizinle bir belge paylaşıldı: ${originalName}`,
          message: `${uploader.name || 'Yönetici'} tarafından paylaşıldı. Belgelerim sekmesinden indirebilirsiniz.`,
          link: '/stajyer/dashboard/belgeler',
        })
        .catch(() => undefined);
    }

    return { ...saved, recipientCount: targetInterns.length };
  }

  // internId verildiğinde (stajyer görünümü): stajyerin KENDİ yüklediği
  // belgeler + yönetimin bu stajyerle paylaştığı belgeler (özel paylaşım
  // veya "tüm stajyerler" paylaşımı) birlikte döner — kendi "kaldırdığı"
  // (dismiss ettiği) paylaşılan belgeler hariç.
  async findAll(internId?: string, taskId?: string) {
    if (taskId) {
      return this.docsRepo.find({ where: { taskId }, order: { createdAt: 'DESC' } });
    }
    if (!internId) {
      // Yönetici genel görünümü: tüm belgeler
      return this.docsRepo.find({ order: { createdAt: 'DESC' } });
    }

    const recipientDocIds = (
      await this.recipientsRepo.find({ where: { internId }, select: ['documentId'] })
    ).map((r) => r.documentId);
    const dismissedDocIds = (
      await this.dismissalsRepo.find({ where: { internId }, select: ['documentId'] })
    ).map((d) => d.documentId);

    const qb = this.docsRepo
      .createQueryBuilder('doc')
      .where('doc.internId = :internId', { internId })
      .orWhere('doc.sharedWithAll = true');
    if (recipientDocIds.length) {
      qb.orWhere('doc.id IN (:...ids)', { ids: recipientDocIds });
    }
    if (dismissedDocIds.length) {
      qb.andWhere('doc.id NOT IN (:...dismissed)', { dismissed: dismissedDocIds });
    }
    return qb.orderBy('doc.createdAt', 'DESC').getMany();
  }

  async findById(id: string) {
    const doc = await this.docsRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Doküman bulunamadı.');
    return doc;
  }

  // Bir stajyerin, kendisiyle paylaşılan (ama kendisinin YÜKLEMEDİĞİ) bir
  // belgeye gerçekten erişimi var mı kontrol eder — kendi görev listesinden
  // "silmek" istediğinde bunun meşru olduğundan emin olmak için.
  // public — controller'daki GET /:id yetki kontrolü de bunu kullanıyor.
  async internHasAccess(doc: DocumentEntity, internId: string): Promise<boolean> {
    if (doc.internId === internId) return true;
    if (doc.sharedWithAll) return true;
    const recipient = await this.recipientsRepo.findOne({ where: { documentId: doc.id, internId } });
    return !!recipient;
  }

  // requester verildiğinde yetki kontrolü yapılır:
  //  - Yönetici/mentör → belgeyi HERKES için kalıcı olarak siler (dosya dahil).
  //  - Stajyer, KENDİ yüklediği belgeyi siliyorsa → kalıcı silme (dosya dahil).
  //  - Stajyer, yönetimin kendisiyle PAYLAŞTIĞI bir belgeyi siliyorsa →
  //    belge/dosya SİLİNMEZ (diğer alıcılar görmeye devam eder); sadece bu
  //    stajyer için görünürlükten kaldırılır (indirdikten sonra "listemden
  //    kaldır" davranışı).
  async remove(id: string, requester?: { id: string; role: string; internId?: string }) {
    const doc = await this.findById(id);
    const isOwnUpload = (doc.uploadedBy as any)?.id === requester?.id;

    if (requester?.role === 'intern' && !isOwnUpload) {
      const internId = requester.internId;
      if (!internId || !(await this.internHasAccess(doc, internId))) {
        throw new ForbiddenException('Bu belgeyi silme yetkiniz yok.');
      }
      // Kalıcı silme değil — sadece bu stajyer için gizle
      await this.recipientsRepo.delete({ documentId: id, internId });
      await this.dismissalsRepo.save(this.dismissalsRepo.create({ documentId: id, internId }));
      return { message: 'Belge listenizden kaldırıldı.' };
    }

    // Sahibi olan stajyer ya da yönetici/mentör: tam silme
    const filePath = path.join(process.cwd(), doc.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.recipientsRepo.delete({ documentId: id });
    await this.dismissalsRepo.delete({ documentId: id });
    await this.docsRepo.remove(doc);
    return { message: 'Belge silindi.' };
  }
}
