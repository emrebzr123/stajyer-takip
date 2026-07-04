import {
  IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskPriority, TaskStatus } from '../../shared-types';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Görev başlığı zorunludur.' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  internId: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsEnum(TaskPriority, { message: 'Geçersiz öncelik seviyesi.' })
  priority: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsDateString()
  @IsOptional()
  taskStartDate?: string;

  @IsDateString()
  dueDate: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  internId?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsDateString()
  @IsOptional()
  taskStartDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class TaskQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsUUID()
  @IsOptional()
  internId?: string;
}
