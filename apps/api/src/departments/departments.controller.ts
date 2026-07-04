import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.deptService.create(dto);
  }

  @Get()
  findAll() {
    return this.deptService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deptService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateDepartmentDto) {
    return this.deptService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deptService.remove(id);
  }
}
