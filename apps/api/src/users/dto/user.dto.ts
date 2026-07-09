import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../shared-types';

// allow_utf8_local_part: true — mentör/kullanıcı e-postalarının @ öncesindeki
// kısmında Türkçe karakter (ğ, ü, ş, ö, ç, ı, İ) kullanılabilmesi için
// açıkça belirtiyoruz (validator.js'in varsayılanı da true'dur, ancak
// gelecekte paket güncellemesiyle davranış değişmesin diye burada sabitliyoruz).
const TURKISH_FRIENDLY_EMAIL_OPTIONS = { allow_utf8_local_part: true };

export class CreateUserDto {
  @IsEmail(TURKISH_FRIENDLY_EMAIL_OPTIONS, { message: 'Geçerli bir e-posta adresi giriniz.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Ad soyad zorunludur.' })
  name: string;

  @IsEnum(UserRole, { message: 'Geçersiz kullanıcı rolü.' })
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail(TURKISH_FRIENDLY_EMAIL_OPTIONS, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  // Yönetici tarafından şifre SIFIRLAMA (mevcut şifre istemez).
  // Kullanıcının kendi şifresini değiştirmesi için PATCH :id/password
  // (mevcut şifre doğrulamalı) kullanılmaya devam eder.
  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalıdır.' })
  @IsOptional()
  newPassword?: string;
}

// Kullanıcının KENDİ şifresini değiştirmesi için (PATCH :id/password).
// NOT: Önceden bu endpoint `@Body() body: { currentPassword: string; newPassword: string }`
// şeklinde düz bir TS tipiyle tanımlıydı — bu bir class OLMADIĞI için
// class-validator/ValidationPipe hiçbir doğrulama yapmıyordu; teoride 1
// karakterlik bir şifre bile backend'e ulaşabiliyordu, sadece frontend'deki
// kontrol (ve orada da tutarsız biçimde "en az 6 karakter") koruma
// sağlıyordu. Artık admin şifre sıfırlamayla (UpdateUserDto.newPassword)
// AYNI kural (min 8) burada da backend'de zorunlu kılınıyor.
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Mevcut şifre zorunludur.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalıdır.' })
  newPassword: string;
}
