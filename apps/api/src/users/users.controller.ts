import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../shared-types';

// NOT: Bu controller önceden HİÇBİR rol kontrolü yapmıyordu — giriş yapmış
// HERHANGİ bir kullanıcı (bir stajyer dahil) PATCH /users/:id ile
// `role: "admin"` göndererek kendini ya da başkasını admin yapabilirdi.
// Artık kullanıcı YÖNETİMİ (oluşturma/listeleme/güncelleme/silme) sadece
// admin+manager'a açık; rol DEĞİŞTİRME ise service içinde SADECE admin'e
// izinli. `:id/password` (kendi şifreni değiştirme) İSTİSNA — stajyerler
// de kendi şifrelerini bu yoldan değiştiriyor, bu yüzden herkese açık
// kalıyor ama sadece KENDİ id'niz için (aşağıda kontrol ediliyor).
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateUserDto, @CurrentUser() requester: any) {
    if (dto.role === UserRole.ADMIN && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Sadece admin, admin rolünde kullanıcı oluşturabilir.');
    }
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() requester: any) {
    if (dto.role !== undefined && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Rol değiştirme yetkisi sadece admin\'e aittir.');
    }
    return this.usersService.update(id, dto);
  }

  // İSTİSNA: rol kısıtlaması YOK — her kullanıcı (stajyer dahil) kendi
  // şifresini değiştirebilir. Sadece KENDİ id'si için izinli (defans
  // amaçlı — mevcut şifreyi bilmeden zaten geçemez ama yine de kontrol
  // ediyoruz).
  @Patch(':id/password')
  updatePassword(
    @Param('id') id: string,
    @Body() body: ChangePasswordDto,
    @CurrentUser() requester: any,
  ) {
    if (id !== requester.id) {
      throw new ForbiddenException('Sadece kendi şifrenizi değiştirebilirsiniz.');
    }
    return this.usersService.updatePassword(id, body.currentPassword, body.newPassword);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id') id: string, @CurrentUser() requester: any) {
    const target = await this.usersService.findById(id);
    if (target.role === UserRole.ADMIN && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Sadece admin, bir admin hesabını silebilir.');
    }
    return this.usersService.remove(id);
  }
}