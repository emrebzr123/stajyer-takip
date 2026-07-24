import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonnelTaskBoardEntity } from './personnel-task-board.entity';
import { PersonnelTaskItemEntity } from './personnel-task-item.entity';
import { PersonnelTasksService } from './personnel-tasks.service';
import { PersonnelTasksController } from './personnel-tasks.controller';
import { NotificationsModule } from '../notifications/notifications.module';
// "Görev Aktar" ile bir alt görevden aktarılan stajyer alt görevini, kaynak
// alt görev elle işaretlendiğinde de senkron tutabilmek için (ÇİFT YÖNLÜ
// senkronizasyonun ikinci yönü — subtasks.module.ts'deki
// PersonnelTaskItemEntity eklemesinin simetriği). SubTasksModule'ü import
// ediyoruz ki SubTasksService.toggle() metodunu doğrudan çağırabilelim —
// bu, ilerleme/durum yeniden hesaplama mantığını burada tekrarlamamızı
// önlüyor.
import { SubTaskEntity } from '../subtasks/subtask.entity';
import { SubTasksModule } from '../subtasks/subtasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([PersonnelTaskBoardEntity, PersonnelTaskItemEntity, SubTaskEntity]), NotificationsModule, SubTasksModule],
  providers: [PersonnelTasksService],
  controllers: [PersonnelTasksController],
})
export class PersonnelTasksModule {}
