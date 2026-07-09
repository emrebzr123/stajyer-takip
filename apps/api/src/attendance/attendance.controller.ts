import { Controller, Post, Get, UseGuards, Req, Query, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('check-in')
  checkIn(@Req() req: any) {
    return this.service.checkIn(req.user.internId);
  }

  @Post('check-out')
  checkOut(@Req() req: any) {
    return this.service.checkOut(req.user.internId);
  }

  @Get('today')
  getTodayStatus(@Req() req: any) {
    return this.service.getTodayStatus(req.user.internId);
  }

  @Get('history')
  getHistory(@Req() req: any, @Query('internId') internId?: string) {
    // Stajyer yalnızca KENDİ geçmişini görür; yönetici/admin internId
    // parametresiyle herhangi bir stajyerin devam kaydına bakabilir
    // (stajyer detay ekranı bu parametreyi kullanır).
    const target = req.user.role === 'intern' ? req.user.internId : (internId || req.user.internId);
    return this.service.getHistory(target);
  }

  // Şirket geneli devam görünümü ("bugün kim ofiste, kim değil") — sadece
  // yönetici/mentör kullanabilir, stajyer başkalarının devam kaydını
  // topluca göremez.
  @Get('overview')
  getOverview(@Req() req: any, @Query('date') date?: string) {
    if (req.user?.role === 'intern') {
      throw new ForbiddenException('Bu görünüme erişim yetkiniz yok.');
    }
    return this.service.getOverviewForDate(date);
  }
}
