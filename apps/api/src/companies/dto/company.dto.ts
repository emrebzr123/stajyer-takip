import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class CreateCompanyDto {
  @IsString() @IsNotEmpty() @MaxLength(60, { message: 'Şirket adı en fazla 60 karakter olabilir.' }) name: string;
}
