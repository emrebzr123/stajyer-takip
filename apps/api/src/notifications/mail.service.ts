import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private getTransporter() {
    // NOT: `service: 'gmail'` kısayolu varsayılan olarak 465 (SSL) portunu
    // kullanır. Railway gibi PaaS sağlayıcıları çoğu zaman spam kötüye
    // kullanımını önlemek için outbound SMTP portlarını (özellikle 465'i)
    // kısıtlar — bu durumda bağlantı "Connection timeout" ile başarısız
    // olur (şifre/kullanıcı adıyla ilgisi yoktur). 587 (STARTTLS) bazı
    // ortamlarda hâlâ açık kalabiliyor; connectionTimeout de kısaltılarak
    // arka planda gönderilen mailin çok uzun süre "asılı" kalması önlenir.
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,       // 587 → STARTTLS (bağlantı düz başlar, sonra şifrelenir)
      requireTLS: true,
      auth: {
        user: this.config.get('GMAIL_USER'),
        pass: this.config.get('GMAIL_PASS'),
      },
      connectionTimeout: 10000, // 10sn — varsayılan çok daha uzun, hızlı başarısız olsun
    });
  }

  private getFrom(firmaAdi: string): string {
    return `"${firmaAdi}" <${this.config.get('GMAIL_USER')}>`;
  }

  async sendInternWelcome(params: {
    firmaAdi: string;
    stajyerAdi: string;
    stajyerEmail: string;
    sifre: string;
  }): Promise<void> {
    const { firmaAdi, stajyerAdi, stajyerEmail, sifre } = params;
    const firma = firmaAdi || 'Electromtech';
    try {
      await this.getTransporter().sendMail({
        from: this.getFrom(firma),
        to: stajyerEmail,
        subject: 'Staj Başvurusu Kabulü ve Sistem Giriş Bilgileri Hk.',
        text: `Sayın ${stajyerAdi},

Şirketimize / kurumumuza yapmış olduğunuz staj başvurusu değerlendirilmiştir.

Yapılan değerlendirme sonucunda, başvurunuzun olumlu sonuçlandığını ve Ar-Ge bünyesinde staj yapmaya hak kazandığınızı memnuniyetle bildiririz.

Staj süreciniz boyunca kullanacağınız Stajyer Takip Sistemi panel giriş bilgileriniz aşağıda yer almaktadır:

Giriş E-postanız : ${stajyerEmail}
Giriş Şifreniz   : ${sifre}

Staj süreciniz boyunca, mesleki gelişiminize katkı sağlayacak uygulamalı çalışmalar yapma ve ilgili ekiplerimizle birlikte projelerde aktif olarak yer alma imkânı bulacaksınız.

Aramıza katılacak olmanızdan memnuniyet duyuyor, staj süreciniz boyunca başarılar diliyoruz.

Saygılarımızla,
${firma}
Oğuzhan GÜNEŞ
ARGE Müdürü
0546 464 17 46`,
      });
      this.logger.log(`✅ Kabul maili → ${stajyerEmail}`);
    } catch (err: any) {
      this.logger.error(`❌ Kabul maili gönderilemedi → ${stajyerEmail}: ${err.message}`);
    }
  }

  async sendTaskAssignment(params: {
    firmaAdi: string;
    stajyerAdi: string;
    stajyerEmail: string;
    gorevAdi: string;
    gorevAciklamasi: string;
    olusturmaTarihi: string;
    bitisTarihi: string;
  }): Promise<void> {
    const { firmaAdi, stajyerAdi, stajyerEmail, gorevAdi, gorevAciklamasi, olusturmaTarihi, bitisTarihi } = params;
    const firma = firmaAdi || 'Electromtech';
    try {
      await this.getTransporter().sendMail({
        from: this.getFrom(firma),
        to: stajyerEmail,
        subject: 'Yeni Görev Ataması Bilgilendirmesi',
        // ŞABLON 2: Yeni Görev Tanımlama Bildirim Mesajı — verilen şablonla
        // birebir. NOT: Önceki metin stajyerin erişimi bile olmayan "İş
        // Takip Listesi" (yönetici-only sayfa) adını referans veriyordu;
        // artık sadece stajyerin kendi panelindeki "Haftalık Planım"
        // sayfasına yönlendiriyor.
        text: `Sayın ${stajyerAdi},

Sistem üzerinden staj süreciniz kapsamında profilinize yeni bir görev tanımlaması gerçekleştirilmiştir.

Tanımlanan Görevin Detayları:
- Görev Adı: ${gorevAdi}
- Görev Açıklaması: ${gorevAciklamasi || '—'}
- Oluşturma Tarihi: ${olusturmaTarihi} (Otomatik güncel gün)
- Son Teslim Tarihi: ${bitisTarihi} (Sistemden seçilen tarih)

Söz konusu görevi, panelinizdeki "Haftalık Planım" alanından inceleyebilir, süreç içerisindeki ilerlemelerinizi güncelleyebilirsiniz. Çalışmalarınızda başarılar dileriz.

Saygılarımızla,
${firma}`,
      });
      this.logger.log(`✅ Görev maili → ${stajyerEmail}`);
    } catch (err: any) {
      this.logger.error(`❌ Görev maili gönderilemedi → ${stajyerEmail}: ${err.message}`);
    }
  }

  async sendCustom(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.getTransporter().sendMail({
        from: this.getFrom('Electromtech'),
        to,
        subject,
        text,
      });
      this.logger.log(`✅ Custom mail → ${to}`);
    } catch (err: any) {
      this.logger.error(`❌ Custom mail gönderilemedi → ${to}: ${err.message}`);
      throw err;
    }
  }

  // Staj sonu değerlendirme formunu (Google Anket) stajyere gönderir.
  // Form linki .env'deki EVALUATION_FORM_URL ile değiştirilebilir.
  async sendEvaluationForm(params: {
    firmaAdi: string;
    stajyerAdi: string;
    stajyerEmail: string;
  }): Promise<void> {
    const { firmaAdi, stajyerAdi, stajyerEmail } = params;
    const firma = firmaAdi || 'Electromtech';
    const formUrl =
      this.config.get('EVALUATION_FORM_URL') ||
      'https://docs.google.com/forms/d/e/1FAIpQLSdtXoicffaPypMhnzPPc_EQw2jb4C8z7WtTrCyvl9ENxIdXiA/viewform';

    await this.getTransporter().sendMail({
      from: this.getFrom(firma),
      to: stajyerEmail,
      subject: 'Staj Sonu Değerlendirme Anketi Hk.',
      text: `Sayın ${stajyerAdi},

Şirketimizde tamamlamış olduğunuz staj süreci için teşekkür ederiz.

Staj deneyiminizi değerlendirmeniz ve süreçlerimizi geliştirmemize katkı sağlamanız amacıyla hazırladığımız kısa değerlendirme anketini doldurmanızı rica ederiz:

${formUrl}

Görüşleriniz bizim için çok değerli. Gelecekteki kariyerinizde başarılar dileriz.

Saygılarımızla,
${firma}`,
    });
    this.logger.log(`✅ Değerlendirme formu → ${stajyerEmail}`);
  }
}
