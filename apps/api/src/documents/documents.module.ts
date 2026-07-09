import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentEntity } from './document.entity';
import { DocumentRecipientEntity } from './document-recipient.entity';
import { DocumentDismissalEntity } from './document-dismissal.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { InternEntity } from '../interns/intern.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, DocumentRecipientEntity, DocumentDismissalEntity, InternEntity]),
    MulterModule.register({ dest: process.env.UPLOAD_DEST || './uploads' }),
    NotificationsModule,
  ],
  providers: [DocumentsService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
