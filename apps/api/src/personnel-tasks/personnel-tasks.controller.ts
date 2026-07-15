import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { PersonnelTasksService } from './personnel-tasks.service';
import {
  CreatePersonnelBoardDto, UpdatePersonnelBoardDto,
  CreatePersonnelTaskItemDto, UpdatePersonnelTaskItemDto,
} from './dto/personnel-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../shared-types';

// "Yönetici → Personel" görev bölümü sistemi — "Görevlerim" (admin-tasks)
// ile BİREBİR AYNI yapı, sadece iki taraflı: Yönetici bölüm/görev
// oluşturur-siler, Personel sadece görür ve tamamlandı işaretler.
@Controller('personnel-tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class PersonnelTasksController {
  constructor(private readonly service: PersonnelTasksService) {}

  // Yönetici — belirli bir personelin bölümlerini görür (?assignedToId=)
  @Get('boards')
  @Roles(UserRole.ADMIN)
  findBoards(@Query('assignedToId') assignedToId: string) {
    return this.service.findBoardsFor(assignedToId);
  }

  // Personel — kendi bölümlerini görür (Görevlerim sayfası)
  @Get('boards/my')
  findMyBoards(@Req() req: any) {
    return this.service.findMyBoards(req.user.id);
  }

  @Post('boards')
  @Roles(UserRole.ADMIN)
  createBoard(@Body() dto: CreatePersonnelBoardDto, @Req() req: any) {
    return this.service.createBoard(req.user.id, dto);
  }

  @Patch('boards/:id')
  @Roles(UserRole.ADMIN)
  updateBoard(@Param('id') id: string, @Body() dto: UpdatePersonnelBoardDto) {
    return this.service.updateBoard(id, dto);
  }

  @Delete('boards/:id')
  @Roles(UserRole.ADMIN)
  removeBoard(@Param('id') id: string) {
    return this.service.removeBoard(id);
  }

  // Toplu bölüm silme — path segment sayısı 'boards/:id'den farklı
  // olduğu için Nest ile herhangi bir çakışma olmaz.
  @Delete('boards')
  @Roles(UserRole.ADMIN)
  removeBoards(@Body() body: { ids: string[] }) {
    return this.service.removeBoards(body.ids || []);
  }

  @Delete('boards/:boardId/completed')
  @Roles(UserRole.ADMIN)
  clearCompleted(@Param('boardId') boardId: string) {
    return this.service.clearCompleted(boardId);
  }

  @Post('boards/:boardId/tasks')
  @Roles(UserRole.ADMIN)
  createTask(@Param('boardId') boardId: string, @Body() dto: CreatePersonnelTaskItemDto) {
    return this.service.createTask(boardId, dto);
  }

  // Görev güncelleme — hem admin (düzenleme) hem ilgili Personel
  // (tamamlandı işaretleme) erişebilir; ayrım service içinde yapılıyor.
  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdatePersonnelTaskItemDto, @Req() req: any) {
    return this.service.updateTask(id, req.user.id, req.user.role, dto);
  }

  @Delete('tasks/:id')
  @Roles(UserRole.ADMIN)
  removeTask(@Param('id') id: string) {
    return this.service.removeTask(id);
  }
}
