import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../shared-types';

// NOT: create/findAll/findOne/update (genel, "my" olmayan rotalar) önceden
// HİÇBİR rol kontrolü yapmıyordu — giriş yapmış herhangi bir stajyer,
// CreateTaskDto'daki serbest 'internId' alanı sayesinde kendine (ya da
// başka bir stajyere) doğrudan görev atayabilir, herhangi bir görevi
// (yönetici/mentör onayı olmadan) düzenleyebilir, ID'sini bilerek başka
// stajyerlerin görev detaylarını görebilirdi. Artık bu rotalar sadece
// Admin+Manager'a açık; Stajyer sadece aşağıdaki 'my/*' rotalarını kullanır.
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateTaskDto) { return this.tasksService.create(dto); }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getDashboardStats() { return this.tasksService.getDashboardStats(); }

  @Get('stats/status-distribution')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStatusDistribution() { return this.tasksService.getStatusDistribution(); }

  @Get('stats/completion-trend')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getCompletionTrend() { return this.tasksService.getCompletionTrend(); }

  @Get('stats/intern-progress')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getInternProgress() { return this.tasksService.getInternProgress(); }

  @Get('stats/activities')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getActivities(@Query('limit') limit: string) {
    return this.tasksService.getRecentActivities(parseInt(limit) || 10);
  }

  @Get('stats/upcoming-deadlines')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getUpcomingDeadlines(@Query('limit') limit: string) {
    return this.tasksService.getUpcomingDeadlines(parseInt(limit) || 5);
  }

  // Yorumlar — hem stajyer (kendi görevine) hem admin/manager erişebilmeli,
  // bu yüzden rol kısıtlaması yok, ama stajyer sahiplik kontrolü service
  // katmanında yapılmalı (bkz. addComment). getComments için de aynı
  // mantık: stajyer sadece kendi görevinin yorumlarını görmeli.
  @Get(':id/comments')
  async getComments(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role === 'intern') {
      const task = await this.tasksService.findById(id);
      if ((task as any)?.intern?.id !== req.user?.internId) {
        throw new ForbiddenException('Bu göreve erişim yetkiniz yok.');
      }
    }
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

  // İSTİSNA: rol kısıtlaması yok (herkese açık gibi görünür) — ama Stajyer
  // için manuel sahiplik kontrolü var, sadece KENDİ görevini görebilir.
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const task = await this.tasksService.findById(id);
    if (req.user?.role === 'intern' && (task as any)?.intern?.id !== req.user?.internId) {
      throw new ForbiddenException('Bu göreve erişim yetkiniz yok.');
    }
    return task;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  // NOT: Bu genel endpoint önceden HİÇBİR sahiplik/rol kontrolü yapmıyordu —
  // herhangi bir kimliği doğrulanmış kullanıcı (bir stajyer dahil) ID'sini
  // bilerek herhangi bir görevi silebiliyordu. Artık sadece yönetici/mentör
  // kullanabilir; stajyerler yukarıdaki 'my/:id' rotasını kullanmalı.
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
