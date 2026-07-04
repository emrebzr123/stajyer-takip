import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyPlanEntity } from './weekly-plan.entity';
import { WeeklyPlanTaskEntity } from './weekly-plan-task.entity';
import { WeeklyPlansService } from './weekly-plans.service';
import { WeeklyPlansController } from './weekly-plans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyPlanEntity, WeeklyPlanTaskEntity])],
  providers: [WeeklyPlansService],
  controllers: [WeeklyPlansController],
  exports: [WeeklyPlansService],
})
export class WeeklyPlansModule {}
