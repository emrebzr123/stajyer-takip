import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubTaskEntity } from './subtask.entity';
import { TaskEntity } from '../tasks/task.entity';
import { SubTasksService } from './subtasks.service';
import { SubTasksController } from './subtasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
// "Görev Aktar" ile aktarılan alt görevleri, kaynak Personel alt görevleriyle
// çift yönlü senkron tutabilmek için.
import { PersonnelTaskItemEntity } from '../personnel-tasks/personnel-task-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubTaskEntity, TaskEntity, PersonnelTaskItemEntity]), NotificationsModule],
  providers: [SubTasksService],
  controllers: [SubTasksController],
  exports: [SubTasksService],
})
export class SubTasksModule {}
