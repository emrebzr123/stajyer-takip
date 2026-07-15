import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { InternsService } from '../interns/interns.service';
import { MailService } from '../notifications/mail.service';
import { LoginDto } from './dto/auth.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcryptjs');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly internsService: InternsService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
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

  // "Şifremi Unuttum?" — güvenlik nedeniyle e-posta kayıtlı olsun ya da
  // olmasın HER ZAMAN aynı genel mesajı döneriz (bkz. auth.controller.ts).
  // Bu, bir saldırganın "hangi e-postalar sistemde kayıtlı" diye deneme
  // yanılma yapmasını engeller.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.log(`Şifre sıfırlama denendi ama e-posta kayıtlı değil: ${email}`);
      return; // Sessizce çık — controller yine de genel mesajı döner
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
    await this.usersService.setPasswordResetToken(user.id, token, expires);

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/sifre-sifirla?token=${token}`;

    // Mail gönderimi başarısız olsa bile forgotPassword akışı asla hata
    // fırlatmaz — kullanıcıya her zaman aynı genel mesaj gösterilir.
    try {
      await this.mailService.sendPasswordReset(user.email, user.name, resetLink);
    } catch {
      /* zaten mail.service.ts içinde loglanıyor */
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByValidResetToken(token);
    if (!user) {
      throw new BadRequestException('Bağlantının süresi dolmuş ya da geçersiz. Lütfen yeni bir sıfırlama talebi oluşturun.');
    }
    await this.usersService.resetPasswordWithToken(user.id, newPassword);
  }
}
