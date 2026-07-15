import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, IsBoolean, IsUUID, IsInt } from 'class-validator';

export class CreatePersonnelBoardDto {
  @IsUUID()
  assignedToId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;
}

export class UpdatePersonnelBoardDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

export class CreatePersonnelTaskItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['Yüksek', 'Orta', 'Düşük'])
  @IsOptional()
  priority?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdatePersonnelTaskItemDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsIn(['Yüksek', 'Orta', 'Düşük'])
  @IsOptional()
  priority?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
