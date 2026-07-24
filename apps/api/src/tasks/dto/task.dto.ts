import {
  IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Max, Min, IsArray,
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

  // NOT: "Görev Aktar" ile bir Personel projesindeki/görevindeki alt
  // görevler bu görevin ALT GÖREVLERİ olarak aktarıldığında, her birinin
  // kaynak ID'si (sourcePersonnelTaskItemId) burada, subtasks dizisinin
  // İÇİNDE taşınıyor — çünkü senkronizasyon TEK bir görev değil, HER BİR
  // alt görev seviyesinde çalışıyor.
  @IsArray()
  @IsOptional()
  subtasks?: { title: string; isCompleted?: boolean; orderIndex?: number; sourcePersonnelTaskItemId?: string }[];
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

  @IsArray()
  @IsOptional()
  subtasks?: { title: string; isCompleted?: boolean; orderIndex?: number }[];
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

  // Stajyerin kendi "Görevlerim" ekranında tamamladıktan sonra kendi
  // listesinden kaldırdığı (hiddenFromInternAt dolu) görevleri hariç
  // tutmak için kullanılır. Haftalık Plan ve yönetici tarafı bu parametreyi
  // GÖNDERMEZ — o yüzden gizlenen görevler oralarda görünmeye devam eder.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  excludeHidden?: boolean;
}
