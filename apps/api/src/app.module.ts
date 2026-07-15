import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InternsModule } from './interns/interns.module';
import { TasksModule } from './tasks/tasks.module';
import { DepartmentsModule } from './departments/departments.module';
import { WeeklyPlansModule } from './weekly-plans/weekly-plans.module';
import { CompaniesModule } from './companies/companies.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SubTasksModule } from './subtasks/subtasks.module';
import { MailModule } from './mail/mail.module';
import { DocumentsModule } from './documents/documents.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ReportsModule } from './reports/reports.module';
import { AdminTasksModule } from './admin-tasks/admin-tasks.module';
import { PersonnelTasksModule } from './personnel-tasks/personnel-tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Cron görevleri (teslim tarihi hatırlatmaları) için
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    InternsModule,
    TasksModule,
    WeeklyPlansModule,
    CompaniesModule,
    AttendanceModule,
    SubTasksModule,
    MailModule,
    DocumentsModule,
    AnnouncementsModule,
    ReportsModule,
    AdminTasksModule,
    PersonnelTasksModule,
  ],
})
export class AppModule {}
