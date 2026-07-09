import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternEntity } from './intern.entity';
import { InternsService } from './interns.service';
import { InternsController } from './interns.controller';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([InternEntity]), CompaniesModule, NotificationsModule],
  providers: [InternsService],
  controllers: [InternsController],
  exports: [InternsService],
})
export class InternsModule {}
