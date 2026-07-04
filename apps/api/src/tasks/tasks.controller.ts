import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Get()
  findAll(@Query() query: TaskQueryDto) {
    return this.tasksService.findAll(query);
  }

  @Get('stats/dashboard')
  getDashboardStats() {
    return this.tasksService.getDashboardStats();
  }

  @Get('stats/status-distribution')
  getStatusDistribution() {
    return this.tasksService.getStatusDistribution();
  }

  @Get('stats/completion-trend')
  getCompletionTrend() {
    return this.tasksService.getCompletionTrend();
  }

  @Get('stats/intern-progress')
  getInternProgress() {
    return this.tasksService.getInternProgress();
  }

  @Get('stats/activities')
  getActivities(@Query('limit') limit: string) {
    return this.tasksService.getRecentActivities(parseInt(limit) || 10);
  }

  @Get('stats/upcoming-deadlines')
  getUpcomingDeadlines(@Query('limit') limit: string) {
    return this.tasksService.getUpcomingDeadlines(parseInt(limit) || 5);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
