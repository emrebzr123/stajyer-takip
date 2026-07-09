import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementEntity } from './announcement.entity';
import { AnnouncementsService } from './announcements.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnnouncementsController } from './announcements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEntity]), NotificationsModule],
  providers: [AnnouncementsService],
  controllers: [AnnouncementsController],
})
export class AnnouncementsModule {}
