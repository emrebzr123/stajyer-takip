import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre zorunludur.' })
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Ad soyad zorunludur.' })
  name: string;
}
