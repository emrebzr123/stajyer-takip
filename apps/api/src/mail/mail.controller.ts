import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MailService } from '../notifications/mail.service';

@Controller('mail')
@UseGuards(JwtAuthGuard)
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
