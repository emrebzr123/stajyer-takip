import {
  IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, IsUUID, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklyTaskStatus } from '../../shared-types';

export class WeeklyPlanTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(WeeklyTaskStatus)
  status: WeeklyTaskStatus;

  @IsInt()
  orderIndex: number;
}

export class CreateWeeklyPlanDto {
  @IsUUID()
  internId: string;

  @IsInt()
  weekNumber: number;

  @IsDateString()
  weekStartDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPlanTaskDto)
  tasks: WeeklyPlanTaskDto[];
}

export class UpdateWeeklyPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPlanTaskDto)
  @IsOptional()
  tasks?: WeeklyPlanTaskDto[];
}
