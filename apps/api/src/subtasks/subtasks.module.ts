import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubTaskEntity } from './subtask.entity';
import { TaskEntity } from '../tasks/task.entity';
import { SubTasksService } from './subtasks.service';
import { SubTasksController } from './subtasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubTaskEntity, TaskEntity]), NotificationsModule],
  providers: [SubTasksService],
  controllers: [SubTasksController],
  exports: [SubTasksService],
})
export class SubTasksModule {}
