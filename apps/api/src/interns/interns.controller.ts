import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Req, ForbiddenException,
} from '@nestjs/common';
import { InternsService } from './interns.service';
import { CreateInternDto, UpdateInternDto, InternQueryDto } from './dto/intern.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../shared-types';
import { MailService } from '../notifications/mail.service';
import { InternshipEndService } from '../notifications/internship-end.service';

// NOT: Bu controller önceden HİÇBİR rol/sahiplik kontrolü yapmıyordu — sadece
// giriş yapmış olmak (JwtAuthGuard) yetiyordu. Bu, giriş yapmış herhangi bir
// stajyerin: (1) başka bir stajyerin TC no/adres/doğum tarihi dahil TÜM
// bilgilerini ID'sini bilerek görebilmesi, (2) herhangi bir stajyer kaydını
// güncelleyebilmesi, (3) hatta silebilmesi anlamına geliyordu. Artık yazma
// işlemleri (oluşturma/güncelleme/silme) sadece Admin+Manager'a açık;
// okuma ise Admin+Manager için sınırsız, Stajyer için SADECE kendi kaydıyla
// sınırlı (aşağıda manuel kontrol — @Roles tek başına bunu ifade edemez).
@Controller('interns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternsController {
  constructor(
    private readonly internsService: InternsService,
    private readonly mailService: MailService,
    private readonly internshipEnd: InternshipEndService,
  ) {}

  @Post(':id/send-evaluation-form')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async sendEvaluationForm(
    @Param('id') id: string,
    @Body() body: { force?: boolean },
  ) {
    const r = await this.internshipEnd.sendEvaluationForm(id, body?.force === true);
    return { message: 'Değerlendirme formu stajyerin e-posta adresine gönderildi.', sentAt: r.sentAt };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() dto: CreateInternDto & { plainPassword?: string }) {
    const intern = await this.internsService.create(dto);

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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  findAll(@Query() query: InternQueryDto) {
    return this.internsService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getStats() { return this.internsService.getStats(); }

  @Get('department-distribution')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getDepartmentDistribution() { return this.internsService.getDepartmentDistribution(); }

  // İSTİSNA: rol kısıtlaması yok (class-level RolesGuard devrede ama
  // metod-level @Roles YOK — yani herkes buraya girebilir), çünkü Stajyer
  // kendi profilini bu yoldan görüyor (bkz. stajyer/dashboard/profil).
  // Bunun yerine MANUEL kontrol: Stajyer SADECE kendi internId'sine eşit
  // bir id isteyebilir, başka bir id istersen 403.
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role === 'intern' && req.user?.internId !== id) {
      throw new ForbiddenException('Sadece kendi kaydınızı görüntüleyebilirsiniz.');
    }
    return this.internsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateInternDto) {
    return this.internsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string) { return this.internsService.remove(id); }
}
