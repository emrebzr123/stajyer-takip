import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceEntity } from './attendance.entity';
import { InternEntity } from '../interns/intern.entity';
import { InternStatus } from '../shared-types';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEntity)
    private readonly repo: Repository<AttendanceEntity>,
    @InjectRepository(InternEntity)
    private readonly internsRepo: Repository<InternEntity>,
  ) {}

  async checkIn(internId: string): Promise<AttendanceEntity> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.repo.findOne({ where: { internId, date: today, checkOut: undefined } });
    if (existing && !existing.checkOut) {
      throw new BadRequestException('Zaten mesaidesiniz.');
    }
    const record = this.repo.create({ internId, checkIn: new Date(), date: today });
    return this.repo.save(record);
  }

  async checkOut(internId: string): Promise<AttendanceEntity> {
    const today = new Date().toISOString().split('T')[0];
    const record = await this.repo.findOne({
      where: { internId, date: today },
      order: { createdAt: 'DESC' },
    });
    if (!record || record.checkOut) throw new BadRequestException('Aktif mesai bulunamadı.');
    record.checkOut = new Date();
    record.duration = Math.round((record.checkOut.getTime() - new Date(record.checkIn).getTime()) / 60000);
    return this.repo.save(record);
  }

  async getTodayStatus(internId: string) {
    const today = new Date().toISOString().split('T')[0];
    const record = await this.repo.findOne({
      where: { internId, date: today },
      order: { createdAt: 'DESC' },
    });
    return {
      isCheckedIn: !!record && !record.checkOut,
      record: record || null,
    };
  }

  async getHistory(internId: string) {
    return this.repo.find({
      where: { internId },
      order: { date: 'DESC' },
      take: 30,
    });
  }

  // Şirket geneli devam görünümü — "bugün kim ofiste, kim değil" sorusuna
  // yönetici tek ekrandan cevap bulabilsin diye. Önceden sadece stajyer
  // detay ekranında TEK bir stajyerin geçmişi görülebiliyordu; tüm aktif
  // stajyerleri aynı anda karşılaştırmalı gösteren bir görünüm yoktu.
  async getOverviewForDate(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const interns = await this.internsRepo.find({
      where: { status: InternStatus.ACTIVE },
      relations: ['user', 'department', 'company'],
      order: { createdAt: 'ASC' },
    });
    if (!interns.length) return { date: targetDate, rows: [] };

    const records = await this.repo.find({
      where: { date: targetDate },
    });
    const recordByIntern = new Map(records.map((r) => [r.internId, r]));

    const rows = interns.map((intern) => {
      const record = recordByIntern.get(intern.id) || null;
      const status: 'office' | 'left' | 'absent' = record
        ? (record.checkOut ? 'left' : 'office')
        : 'absent';
      return {
        internId: intern.id,
        internName: (intern.user as any)?.name || '-',
        department: (intern as any).department?.name || '-',
        workType: (intern as any).workType || null,
        hybridDays: (intern as any).hybridDays || [],
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        duration: record?.duration || null,
        status,
      };
    });

    return { date: targetDate, rows };
  }
}
