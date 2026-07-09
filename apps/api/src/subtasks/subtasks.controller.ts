import { Controller, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SubTasksService } from './subtasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('subtasks')
@UseGuards(JwtAuthGuard)
export class SubTasksController {
  constructor(private readonly service: SubTasksService) {}

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Body() body: { isCompleted: boolean }, @Req() req: any) {
    // Stajyer ise sadece kendi görevini işaretleyebilir; yönetici/admin
    // isteklerinde bu kontrol atlanır (undefined gönderilir).
    const requesterInternId = req.user?.role === 'intern' ? req.user?.internId : undefined;
    return this.service.toggle(id, body.isCompleted, requesterInternId);
  }
}
