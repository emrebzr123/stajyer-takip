import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminTaskBoardEntity } from './admin-task-board.entity';
import { AdminTaskItemEntity } from './admin-task-item.entity';
import { AdminTasksService } from './admin-tasks.service';
import { AdminTasksController } from './admin-tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AdminTaskBoardEntity, AdminTaskItemEntity])],
  providers: [AdminTasksService],
  controllers: [AdminTasksController],
})
export class AdminTasksModule {}
