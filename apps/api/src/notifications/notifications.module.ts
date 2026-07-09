import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageTemplatesService } from './message-templates.service';
import { MailService } from './mail.service';
import { NotificationEntity } from './notification.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { PushService } from './push.service';
import { AppNotificationsService } from './app-notifications.service';
import { DueReminderService } from './due-reminder.service';
import { NotificationsCleanupService } from './notifications-cleanup.service';
import { InternshipEndService } from './internship-end.service';
import { NotificationsController } from './notifications.controller';
import { UserEntity } from '../users/user.entity';
import { TaskEntity } from '../tasks/task.entity';
import { InternEntity } from '../interns/intern.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([NotificationEntity, PushSubscriptionEntity, UserEntity, TaskEntity, InternEntity]),
  ],
  controllers: [NotificationsController],
  providers: [MessageTemplatesService, MailService, PushService, AppNotificationsService, DueReminderService, NotificationsCleanupService, InternshipEndService],
  exports: [MessageTemplatesService, MailService, AppNotificationsService, InternshipEndService, PushService],
})
export class NotificationsModule {}
