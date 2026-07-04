import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { InternsService } from './interns.service';
import { CreateInternDto, UpdateInternDto, InternQueryDto } from './dto/intern.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// Rol guard kaldırıldı — tüm login kullanıcılar erişebilir
@Controller('interns')
@UseGuards(JwtAuthGuard)
export class InternsController {
  constructor(private readonly internsService: InternsService) {}

  @Post()
  create(@Body() dto: CreateInternDto) {
    return this.internsService.create(dto);
  }

  @Get()
  findAll(@Query() query: InternQueryDto) {
    return this.internsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.internsService.getStats();
  }

  @Get('department-distribution')
  getDepartmentDistribution() {
    return this.internsService.getDepartmentDistribution();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.internsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInternDto) {
    return this.internsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.internsService.remove(id);
  }
}
