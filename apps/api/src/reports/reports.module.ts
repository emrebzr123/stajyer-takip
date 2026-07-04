import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TasksModule } from '../tasks/tasks.module';
import { InternsModule } from '../interns/interns.module';

@Module({
  imports: [TasksModule, InternsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
