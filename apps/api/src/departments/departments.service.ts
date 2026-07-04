import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './department.entity';
import { CreateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly deptRepo: Repository<DepartmentEntity>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentEntity> {
    const existing = await this.deptRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Bu bölüm adı zaten mevcut.');
    const dept = this.deptRepo.create(dto);
    return this.deptRepo.save(dept);
  }

  async findAll(): Promise<DepartmentEntity[]> {
    return this.deptRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<DepartmentEntity> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Bölüm bulunamadı.');
    return dept;
  }

  async update(id: string, dto: CreateDepartmentDto): Promise<DepartmentEntity> {
    const dept = await this.findById(id);
    Object.assign(dept, dto);
    return this.deptRepo.save(dept);
  }

  async remove(id: string): Promise<void> {
    const dept = await this.findById(id);
    await this.deptRepo.remove(dept);
  }
}
