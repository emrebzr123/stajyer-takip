import {
  IsDateString, IsEnum, IsOptional, IsString, IsUUID, IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InternStatus } from '../../shared-types';

export class CreateInternDto {
  @IsUUID() userId: string;
  @IsUUID() @IsOptional() companyId?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsUUID() @IsOptional() mentorId?: string;
  @IsString() @IsOptional() term?: string;
  @IsEnum(InternStatus) @IsOptional() status?: InternStatus;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() university?: string;
  @IsString() @IsOptional() academicDepartment?: string;
  @IsString() @IsOptional() gpa?: string;
  @IsString() @IsOptional() tcNo?: string;
  @IsString() @IsOptional() birthDate?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() internType?: string;
  @IsString() @IsOptional() workType?: string;
  @IsArray() @IsOptional() hybridDays?: string[];
  @IsString() @IsOptional() notes?: string;
}

export class UpdateInternDto {
  @IsUUID() @IsOptional() companyId?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsUUID() @IsOptional() mentorId?: string;
  @IsString() @IsOptional() term?: string;
  @IsEnum(InternStatus) @IsOptional() status?: InternStatus;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() university?: string;
  @IsString() @IsOptional() academicDepartment?: string;
  @IsString() @IsOptional() gpa?: string;
  @IsString() @IsOptional() tcNo?: string;
  @IsString() @IsOptional() birthDate?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() internType?: string;
  @IsString() @IsOptional() workType?: string;
  @IsArray() @IsOptional() hybridDays?: string[];
  @IsString() @IsOptional() notes?: string;
}

export class InternQueryDto {
  @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number = 1;
  @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number = 10;
  @IsString() @IsOptional() search?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsEnum(InternStatus) @IsOptional() status?: InternStatus;
  @IsString() @IsOptional() term?: string;
}
