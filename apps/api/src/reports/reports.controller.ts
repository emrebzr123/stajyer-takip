import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../shared-types';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('performance')
  getPerformance() {
    return this.reportsService.getPerformanceReport();
  }

  @Get('completion-trend')
  getCompletionTrend() {
    return this.reportsService.getCompletionTrend();
  }

  @Get('department-distribution')
  getDepartmentDistribution() {
    return this.reportsService.getDepartmentTaskDistribution();
  }
}
