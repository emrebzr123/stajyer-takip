import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyEntity } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly repo: Repository<CompanyEntity>,
  ) {}

  async findAll(): Promise<CompanyEntity[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOrCreate(name: string): Promise<CompanyEntity> {
    const existing = await this.repo.findOne({ where: { name: name.trim() } });
    if (existing) return existing;
    const company = this.repo.create({ name: name.trim() });
    return this.repo.save(company);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.repo.delete(id);
    return { message: 'Firma silindi.' };
  }
}
