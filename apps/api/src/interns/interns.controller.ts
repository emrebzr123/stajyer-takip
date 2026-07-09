import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { InternsService } from './interns.service';
import { CreateInternDto, UpdateInternDto, InternQueryDto } from './dto/intern.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MailService } from '../notifications/mail.service';
import { InternshipEndService } from '../notifications/internship-end.service';

@Controller('interns')
@UseGuards(JwtAuthGuard)
export class InternsController {
  constructor(
    private readonly internsService: InternsService,
    private readonly mailService: MailService,
    private readonly internshipEnd: InternshipEndService,
  ) {}

  // Staj sonu değerlendirme formunu (Google Anket) stajyerin e-postasına
  // gönderir. force=true daha önce gönderilmiş olsa bile yeniden yollar.
  @Post(':id/send-evaluation-form')
  async sendEvaluationForm(
    @Param('id') id: string,
    @Body() body: { force?: boolean },
  ) {
    const r = await this.internshipEnd.sendEvaluationForm(id, body?.force === true);
    return { message: 'Değerlendirme formu stajyerin e-posta adresine gönderildi.', sentAt: r.sentAt };
  }

  @Post()
  async create(@Body() dto: CreateInternDto & { plainPassword?: string }) {
    const intern = await this.internsService.create(dto);

    // Stajyer oluşturulunca otomatik kabul maili gönder.
    // NOT: Önceden bu `await` ile bekleniyordu — yani Gmail SMTP bağlantısı
    // yavaşsa (özellikle Railway container yeni uyandıysa/soğuksa) TÜM
    // "Stajyer Ekle" isteği mail gönderilene kadar (bazen 10-30+ saniye)
    // tamamlanmıyordu. Bu sürede tarayıcı/Railway'in kendi ağ geçidi isteği
    // zaman aşımına uğratıp kullanıcıya "hata oluştu" gösteriyordu — oysa
    // stajyer kaydı zaten YUKARIDA (bir satır önce) veritabanına yazılmıştı,
    // bu yüzden sayfa yenilenince stajyer görünüyordu. Mail gönderimi arka
    // planda, yanıtı bekletmeden devam eder; kendi içinde try/catch olduğu
    // için (bkz. mail.service.ts) hata olursa sadece loglanır, uygulamayı
    // çökertmez.
    if (intern.user?.email) {
      this.mailService.sendInternWelcome({
        firmaAdi:      intern.company?.name || 'Electromtech',
        stajyerAdi:   intern.user.name     || '',
        stajyerEmail: intern.user.email,
        sifre:        dto.plainPassword    || '(Kayıt sırasında belirlediğiniz şifre)',
      }).catch(() => undefined);
    }

    return intern;
  }

  @Get()
  findAll(@Query() query: InternQueryDto) {
    return this.internsService.findAll(query);
  }

  @Get('stats')
  getStats() { return this.internsService.getStats(); }

  @Get('department-distribution')
  getDepartmentDistribution() { return this.internsService.getDepartmentDistribution(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.internsService.findById(id); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInternDto) {
    return this.internsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.internsService.remove(id); }
}
