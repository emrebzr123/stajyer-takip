import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) { return this.tasksService.create(dto); }

  @Get()
  findAll(@Query() query: TaskQueryDto) { return this.tasksService.findAll(query); }

  // Stajyer kendi görevlerini görür
  @Get('my')
  getMyTasks(@Query() query: TaskQueryDto, @Req() req: any) {
    return this.tasksService.findAll({ ...query, internId: req.user?.internId });
  }

  // Stajyer kendi görevinin durumunu günceller
  @Patch('my/:id/status')
  updateMyTaskStatus(
    @Param('id') id: string,
    @Body() body: { status: string; progress?: number },
    @Req() req: any,
  ) {
    return this.tasksService.updateStatus(id, body.status, body.progress, req.user?.internId);
  }

  @Get('stats/dashboard')
  getDashboardStats() { return this.tasksService.getDashboardStats(); }

  @Get('stats/status-distribution')
  getStatusDistribution() { return this.tasksService.getStatusDistribution(); }

  @Get('stats/completion-trend')
  getCompletionTrend() { return this.tasksService.getCompletionTrend(); }

  @Get('stats/intern-progress')
  getInternProgress() { return this.tasksService.getInternProgress(); }

  @Get('stats/activities')
  getActivities(@Query('limit') limit: string) {
    return this.tasksService.getRecentActivities(parseInt(limit) || 10);
  }

  @Get('stats/upcoming-deadlines')
  getUpcomingDeadlines(@Query('limit') limit: string) {
    return this.tasksService.getUpcomingDeadlines(parseInt(limit) || 5);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.tasksService.getComments(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: { content: string }, @Req() req: any) {
    return this.tasksService.addComment(
      id,
      { id: req.user.id, role: req.user.role, name: req.user.name, internId: req.user.internId },
      body.content || '',
    );
  }

  // Stajyer kendi görevini siler. Tamamlanmış (checklist %100) bir görev
  // yanlışlıkla oluşturulduysa ya da artık gerekmiyorsa kaldırabilsin diye
  // eklendi. Sahiplik kontrolü tasksService.remove içinde yapılır — bir
  // stajyer başka bir stajyerin görevini bu yoldan silemez.
  // NOT: Frontend artık bu gerçek-silme endpoint'ini KULLANMIYOR — stajyer
  // panelindeki "Sil" butonu aşağıdaki 'my/:id/hide' rotasını çağırıyor
  // (görev veritabanında kalır, sadece stajyerin kendi listesinden
  // kaldırılır). Bu rota geriye dönük uyumluluk için duruyor.
  @Delete('my/:id')
  removeMine(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.remove(id, req.user?.internId);
  }

  // Stajyerin tamamladığı bir görevi KENDİ "Görevlerim" ekranından
  // kaldırması — gerçek silme değildir, bkz. tasksService.hideForIntern.
  // Haftalık Plan ve İş Takip Listesi'nde görünmeye devam eder.
  @Patch('my/:id/hide')
  hideMine(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.hideForIntern(id, req.user?.internId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.tasksService.findById(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  // NOT: Bu genel endpoint önceden HİÇBİR sahiplik/rol kontrolü yapmıyordu —
  // herhangi bir kimliği doğrulanmış kullanıcı (bir stajyer dahil) ID'sini
  // bilerek herhangi bir görevi silebiliyordu. Artık sadece yönetici/mentör
  // kullanabilir; stajyerler yukarıdaki 'my/:id' rotasını kullanmalı.
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role === 'intern') {
      throw new ForbiddenException('Bu işlem için /tasks/my/:id kullanılmalı.');
    }
    return this.tasksService.remove(id);
  }
}
