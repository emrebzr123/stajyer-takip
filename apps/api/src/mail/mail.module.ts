import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MailController],
})
export class MailModule {}
