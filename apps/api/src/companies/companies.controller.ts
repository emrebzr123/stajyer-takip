import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../shared-types';

// NOT: create/remove önceden HİÇBİR rol kontrolü yapmıyordu — giriş yapmış
// herhangi bir stajyer şirket ekleyip silebilirdi. findAll (liste) herkese
// açık kalıyor çünkü stajyer ekleme formundaki "Firma" dropdown'ı ve proje
// oluşturma ekranı bu listeyi okuyor.
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateCompanyDto) { return this.service.findOrCreate(dto.name); }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
