import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../shared-types';
import { MailService } from '../notifications/mail.service';

// NOT: Bu endpoint önceden HİÇBİR rol kontrolü yapmıyordu — giriş yapmış
// herhangi bir stajyer, 'to' alanına İSTEDİĞİ herhangi bir e-postayı yazıp
// (mentörüyle ilgisi olmayan, sistem dışı biri dahil) keyfi içerikle mail
// gönderebilirdi — sistemin kendi mail altyapısı (Brevo) üzerinden
// spam/phishing aracı olarak kötüye kullanılabilirdi. Artık sadece
// Admin+Manager (arayüzde zaten sadece onların erişebildiği "Mail Gönder"
// özelliği) kullanabiliyor.
@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async send(@Body() body: {
    to: string; subject: string; text: string; internName?: string;
    // Ek dosya — frontend'de FileReader ile base64'e çevrilip gönderiliyor
    // (data:...;base64, öneki ÇIKARILMIŞ hâliyle).
    attachment?: { content: string; name: string };
  }) {
    await this.mailService.sendCustom(
      body.to, body.subject, body.text,
      body.attachment ? [body.attachment] : undefined,
    );
    return { message: 'Mail gönderildi.' };
  }
}
