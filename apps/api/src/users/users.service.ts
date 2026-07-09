import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');
import { UserEntity } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({ ...dto, passwordHash });
    return this.usersRepo.save(user);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);
    const { newPassword, ...rest } = dto;
    Object.assign(user, rest);
    // Yönetici şifre sıfırlaması — mevcut şifre doğrulaması gerektirmez
    if (newPassword) {
      (user as any).passwordHash = await bcrypt.hash(newPassword, 12);
    }
    return this.usersRepo.save(user);
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // passwordHash select:false — QueryBuilder ile çek
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Mevcut şifre hatalı.');

    const newHash = await bcrypt.hash(newPassword, 12);

    await this.usersRepo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ passwordHash: newHash })
      .where('id = :id', { id })
      .execute();

    return { message: 'Şifre güncellendi.' };
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.usersRepo.remove(user);
    return { message: 'Kullanıcı silindi.' };
  }
}
