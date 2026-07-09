import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { InternsService } from '../interns/interns.service';
import { LoginDto } from './dto/auth.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly internsService: InternsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı.');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('E-posta veya şifre hatalı.');

    // Stajyer ise internId'yi bul
    let internId: string | null = null;
    if (user.role === 'intern') {
      try {
        const interns = await this.internsService.findAll({ page: 1, limit: 1000 });
        const intern = (interns.data as any[]).find((i) => i.userId === user.id);
        internId = intern?.id || null;
      } catch { /* ignore */ }
    }

    const payload = {
      sub:      user.id,
      email:    user.email,
      role:     user.role,
      name:     user.name,
      internId: internId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id:       user.id,
        email:    user.email,
        name:     user.name,
        role:     user.role,
        internId: internId,
      },
    };
  }

  async getMe(userId: string) {
    return this.usersService.findById(userId);
  }
}
