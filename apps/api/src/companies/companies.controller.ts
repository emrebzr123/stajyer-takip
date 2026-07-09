import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  create(@Body() dto: CreateCompanyDto) { return this.service.findOrCreate(dto.name); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
