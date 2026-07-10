import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─────────────────────────────────────────────────────────────────────────────
// MAIL GÖNDERİMİ — BREVO REST API (HTTPS), SMTP DEĞİL
//
// Önceden bu servis nodemailer + Gmail SMTP (465/587) kullanıyordu. Railway
// gibi PaaS sağlayıcıları, spam kötüye kullanımını önlemek için outbound SMTP
// portlarının TAMAMINI (hem 465 hem 587) engelliyor — bu yüzden her mail
// denemesi "Connection timeout" ile başarısız oluyordu; kod/şifre sorunu
// DEĞİLDİ, ağ seviyesinde bir kısıtlamaydı.
//
// Çözüm: Brevo'nun (eski adıyla Sendinblue) HTTPS REST API'si üzerinden mail
// gönderiyoruz. Bu, normal bir API isteği gibi davrandığı için hiçbir PaaS'ın
// SMTP engellemesinden etkilenmez. Brevo'nun ücretsiz katmanı günde 300 / ayda
// 9.000 mail'e izin veriyor (kredi kartı istemiyor) — bu uygulamanın hacmi
// için fazlasıyla yeterli. Özel bir domain'e de gerek yok: "Single Sender"
// doğrulamasıyla mevcut Gmail/Hotmail adresinizden gönderebilirsiniz.
//
// Gerekli ortam değişkenleri:
//   BREVO_API_KEY      — Brevo Dashboard → SMTP & API → API Keys
//   BREVO_SENDER_EMAIL — Brevo'da "Single Sender" olarak doğrulanmış adresiniz
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private async sendViaBrevo(params: {
    to: string;
    toName?: string;
    subject: string;
    text: string;
    fromName?: string;
  }): Promise<void> {
    const apiKey = this.config.get('BREVO_API_KEY');
    const senderEmail = this.config.get('BREVO_SENDER_EMAIL');

    if (!apiKey || !senderEmail) {
      throw new Error(
        'BREVO_API_KEY / BREVO_SENDER_EMAIL tanımlı değil — Railway Variables kısmına ekleyin.',
      );
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: params.fromName || 'Electromtech', email: senderEmail },
        to: [{ email: params.to, name: params.toName || params.to }],
        subject: params.subject,
        textContent: params.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`);
    }
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
      await this.sendViaBrevo({
        to: stajyerEmail,
        toName: stajyerAdi,
        fromName: firma,
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
      await this.sendViaBrevo({
        to: stajyerEmail,
        toName: stajyerAdi,
        fromName: firma,
        subject: 'Yeni Görev Ataması Bilgilendirmesi',
        text: `Sayın ${stajyerAdi},

Sistem üzerinden staj süreciniz kapsamında profilinize yeni bir görev tanımlaması gerçekleştirilmiştir.

Tanımlanan Görevin Detayları:
- Görev Adı: ${gorevAdi}
- Görev Açıklaması: ${gorevAciklamasi || '—'}
- Oluşturma Tarihi: ${olusturmaTarihi}
- Son Teslim Tarihi: ${bitisTarihi}

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
      await this.sendViaBrevo({ to, subject, text, fromName: 'Electromtech' });
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

    await this.sendViaBrevo({
      to: stajyerEmail,
      toName: stajyerAdi,
      fromName: firma,
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