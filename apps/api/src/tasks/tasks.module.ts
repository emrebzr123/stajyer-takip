import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task.entity';
import { TaskCommentEntity } from './task-comment.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubTasksModule } from '../subtasks/subtasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity, TaskCommentEntity]), NotificationsModule, SubTasksModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
