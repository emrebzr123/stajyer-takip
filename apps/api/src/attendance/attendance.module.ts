import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEntity } from './attendance.entity';
import { InternEntity } from '../interns/intern.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceEntity, InternEntity])],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
