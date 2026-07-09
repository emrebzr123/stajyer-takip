import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString, IsBoolean, IsInt } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateBoardDto {
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

export class CreateTaskItemDto {
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

export class UpdateTaskItemDto {
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
