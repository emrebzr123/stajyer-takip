import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InternsModule } from './interns/interns.module';
import { TasksModule } from './tasks/tasks.module';
import { DepartmentsModule } from './departments/departments.module';
import { WeeklyPlansModule } from './weekly-plans/weekly-plans.module';
import { CompaniesModule } from './companies/companies.module';
import { DocumentsModule } from './documents/documents.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    InternsModule,
    TasksModule,
    WeeklyPlansModule,
    CompaniesModule,
    DocumentsModule,
    AnnouncementsModule,
    ReportsModule,
  ],
})
export class AppModule {}
