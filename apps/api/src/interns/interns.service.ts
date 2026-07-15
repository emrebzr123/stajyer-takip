import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternEntity } from './intern.entity';
import { CreateInternDto, UpdateInternDto, InternQueryDto } from './dto/intern.dto';
import { InternStatus } from '../shared-types';

@Injectable()
export class InternsService {
  constructor(
    @InjectRepository(InternEntity)
    private readonly internsRepo: Repository<InternEntity>,
  ) {}

  private baseQuery() {
    return this.internsRepo
      .createQueryBuilder('intern')
      .leftJoinAndSelect('intern.user', 'user')
      .leftJoinAndSelect('intern.department', 'department')
      .leftJoinAndSelect('intern.mentor', 'mentor')
      .leftJoinAndSelect('intern.company', 'company');
  }

  async create(dto: CreateInternDto): Promise<InternEntity> {
    const intern = this.internsRepo.create(dto);
    const saved  = await this.internsRepo.save(intern);
    return this.findById(saved.id);
  }

  async findAll(query: InternQueryDto) {
    const { page = 1, limit = 10, search, departmentId, status, term } = query;
    const qb = this.baseQuery().orderBy('intern.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(LOWER(user.name) LIKE :s OR LOWER(user.email) LIKE :s OR LOWER(department.name) LIKE :s OR LOWER(company.name) LIKE :s)',
        { s: `%${search.toLowerCase()}%` },
      );
    }
    if (departmentId) qb.andWhere('intern.departmentId = :departmentId', { departmentId });
    if (status)       qb.andWhere('intern.status = :status', { status });
    if (term)         qb.andWhere('LOWER(intern.term) LIKE :term', { term: `%${term.toLowerCase()}%` });

    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(limit).getMany();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<InternEntity> {
    const intern = await this.baseQuery().where('intern.id = :id', { id }).getOne();
    if (!intern) throw new NotFoundException('Stajyer bulunamadı.');
    return intern;
  }

  async update(id: string, dto: UpdateInternDto): Promise<InternEntity> {
    const updateData: any = {};
    if (dto.companyId        !== undefined) updateData.companyId        = dto.companyId;
    if (dto.departmentId     !== undefined) updateData.departmentId     = dto.departmentId;
    if (dto.mentorId         !== undefined) updateData.mentorId         = dto.mentorId;
    if (dto.term             !== undefined) updateData.term             = dto.term;
    if (dto.status           !== undefined) updateData.status           = dto.status;
    if (dto.startDate        !== undefined) updateData.startDate        = dto.startDate;
    if (dto.endDate          !== undefined) updateData.endDate          = dto.endDate;
    if (dto.phone            !== undefined) updateData.phone            = dto.phone;
    if (dto.university       !== undefined) updateData.university       = dto.university;
    if (dto.academicDepartment !== undefined) updateData.academicDepartment = dto.academicDepartment;
    if (dto.gpa              !== undefined) updateData.gpa              = dto.gpa;
    if (dto.internType       !== undefined) updateData.internType       = dto.internType;
    if (dto.workType         !== undefined) updateData.workType         = dto.workType;
    if (dto.hybridDays       !== undefined) updateData.hybridDays       = dto.hybridDays;
    if (dto.notes            !== undefined) updateData.notes            = dto.notes;
    if (dto.tcNo             !== undefined) updateData.tcNo             = dto.tcNo;
    if (dto.birthDate        !== undefined) updateData.birthDate        = dto.birthDate;
    if (dto.address          !== undefined) updateData.address          = dto.address;
    if (dto.mainTask         !== undefined) updateData.mainTask         = dto.mainTask;

    await this.internsRepo
      .createQueryBuilder()
      .update(InternEntity)
      .set(updateData)
      .where('id = :id', { id })
      .execute();

    return this.findById(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const intern = await this.findById(id);
    const userId = intern.userId;

    await this.internsRepo
      .createQueryBuilder()
      .delete()
      .from(InternEntity)
      .where('id = :id', { id })
      .execute();

    try {
      const remaining = await this.internsRepo.count({ where: { userId } });
      if (remaining === 0) {
        await this.internsRepo.manager
          .createQueryBuilder()
          .delete()
          .from('users')
          .where('id = :userId', { userId })
          .execute();
      }
    } catch { /* ignore */ }

    return { message: 'Stajyer silindi.' };
  }

  async getStats() {
    const total     = await this.internsRepo.count();
    const active    = await this.internsRepo.count({ where: { status: InternStatus.ACTIVE } });
    const graduated = await this.internsRepo.count({ where: { status: InternStatus.GRADUATED } });
    const passive   = await this.internsRepo.count({ where: { status: InternStatus.PASSIVE } });
    const left      = await this.internsRepo.count({ where: { status: InternStatus.LEFT } });
    return { total, active, graduated, passive, left };
  }

  async getDepartmentDistribution() {
    return this.internsRepo
      .createQueryBuilder('intern')
      .leftJoin('intern.department', 'department')
      .select('department.id', 'departmentId')
      .addSelect('department.name', 'name')
      .addSelect('COUNT(intern.id)', 'count')
      .where('department.id IS NOT NULL')
      .groupBy('department.id')
      .addGroupBy('department.name')
      .orderBy('count', 'DESC')
      .getRawMany();
  }
}
