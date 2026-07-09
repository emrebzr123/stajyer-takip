import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MailService } from '../notifications/mail.service';

@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async send(@Body() body: { to: string; subject: string; text: string; internName?: string }) {
    await this.mailService.sendCustom(body.to, body.subject, body.text);
    return { message: 'Mail gönderildi.' };
  }
}
