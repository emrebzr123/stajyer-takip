import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonnelTaskBoardEntity } from './personnel-task-board.entity';
import { PersonnelTaskItemEntity } from './personnel-task-item.entity';
import { PersonnelTasksService } from './personnel-tasks.service';
import { PersonnelTasksController } from './personnel-tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([PersonnelTaskBoardEntity, PersonnelTaskItemEntity]), NotificationsModule],
  providers: [PersonnelTasksService],
  controllers: [PersonnelTasksController],
})
export class PersonnelTasksModule {}
