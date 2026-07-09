import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { AdminTasksService } from './admin-tasks.service';
import { CreateBoardDto, UpdateBoardDto, CreateTaskItemDto, UpdateTaskItemDto } from './dto/admin-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// "Görevlerim" — yöneticinin KİŞİSEL Kanban panosu. Stajyer takip
// sisteminden tamamen bağımsızdır; stajyerlerin erişimi yoktur (aşağıdaki
// her metodun başındaki rol kontrolüne bakın).
@Controller('admin-tasks')
@UseGuards(JwtAuthGuard)
export class AdminTasksController {
  constructor(private readonly service: AdminTasksService) {}

  private assertNotIntern(req: any) {
    if (req.user?.role === 'intern') {
      throw new ForbiddenException('Bu bölüme erişim yetkiniz yok.');
    }
  }

  @Get('boards')
  findBoards(@Req() req: any) {
    this.assertNotIntern(req);
    return this.service.findBoardsForOwner(req.user.id);
  }

  @Post('boards')
  createBoard(@Body() dto: CreateBoardDto, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.createBoard(req.user.id, dto);
  }

  @Patch('boards/:id')
  updateBoard(@Param('id') id: string, @Body() dto: UpdateBoardDto, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.updateBoard(id, req.user.id, dto);
  }

  @Delete('boards/:id')
  removeBoard(@Param('id') id: string, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.removeBoard(id, req.user.id);
  }

  // Birden fazla bölümü tek seferde siler (toplu seçim ile). Bu rotanın
  // path segment sayısı 'boards/:id'den farklı (parametre yok) olduğu için
  // Nest ile herhangi bir çakışma/sıralama sorunu yaşanmaz.
  @Delete('boards')
  removeBoards(@Body() body: { ids: string[] }, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.removeBoards(body.ids || [], req.user.id);
  }

  // Bir bölümdeki tüm tamamlanmış görevleri tek seferde temizler.
  @Delete('boards/:boardId/completed')
  clearCompleted(@Param('boardId') boardId: string, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.clearCompleted(boardId, req.user.id);
  }

  @Post('boards/:boardId/tasks')
  createTask(@Param('boardId') boardId: string, @Body() dto: CreateTaskItemDto, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.createTask(boardId, req.user.id, dto);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskItemDto, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.updateTask(id, req.user.id, dto);
  }

  @Delete('tasks/:id')
  removeTask(@Param('id') id: string, @Req() req: any) {
    this.assertNotIntern(req);
    return this.service.removeTask(id, req.user.id);
  }
}
