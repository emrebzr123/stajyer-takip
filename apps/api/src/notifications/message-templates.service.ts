import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageTemplatesService {

  generateInternWelcomeMessage(params: {
    firmaAdi: string;
    stajyerAdi: string;
    stajyerEposta: string;
    stajyerSifre: string;
  }): { konu: string; mesaj: string } {
    const { firmaAdi, stajyerAdi, stajyerEposta, stajyerSifre } = params;
    const firma = firmaAdi || 'Electromtech';
    return {
      konu: 'Staj Başvurusu Kabulü ve Sistem Giriş Bilgileri Hk.',
      mesaj: `KİMDEN: ${firma}
KONU: Staj Başvurusu Kabulü ve Sistem Giriş Bilgileri Hk.

Sayın ${stajyerAdi},

Şirketimize / kurumumuza yapmış olduğunuz staj başvurusu değerlendirilmiştir.

Yapılan değerlendirme sonucunda, başvurunuzun olumlu sonuçlandığını ve Ar-Ge bünyesinde staj yapmaya hak kazandığınızı memnuniyetle bildiririz.

Staj süreciniz boyunca kullanacağınız Görev Takip Sistemi panel giriş bilgileriniz aşağıda yer almaktadır:

Giriş E-postanız : ${stajyerEposta}
Giriş Şifreniz   : ${stajyerSifre}

Staj süreciniz boyunca, mesleki gelişiminize katkı sağlayacak uygulamalı çalışmalar yapma ve ilgili ekiplerimizle birlikte projelerde aktif olarak yer alma imkânı bulacaksınız.

Aramıza katılacak olmanızdan memnuniyet duyuyor, staj süreciniz boyunca başarılar diliyoruz.

Saygılarımızla,
${firma}
Oğuzhan GÜNEŞ
ARGE Müdürü
0546 464 17 46`,
    };
  }

  generateTaskAssignmentMessage(params: {
    firmaAdi: string;
    stajyerAdi: string;
    gorevAdi: string;
    gorevAciklamasi: string;
    olusturmaTarihi: string;
    bitisTarihi: string;
  }): { konu: string; mesaj: string } {
    const { firmaAdi, stajyerAdi, gorevAdi, gorevAciklamasi, olusturmaTarihi, bitisTarihi } = params;
    const firma = firmaAdi || 'Electromtech';
    return {
      konu: 'Yeni Görev Ataması Bilgilendirmesi',
      mesaj: `KİMDEN: ${firma}
KONU: Yeni Görev Ataması Bilgilendirmesi

Sayın ${stajyerAdi},

Sistem üzerinden staj süreciniz kapsamında profilinize yeni bir görev tanımlaması gerçekleştirilmiştir.

Tanımlanan Görevin Detayları:
- Görev Adı: ${gorevAdi}
- Görev Açıklaması: ${gorevAciklamasi || '—'}
- Oluşturma Tarihi: ${olusturmaTarihi}
- Son Teslim Tarihi: ${bitisTarihi}

Söz konusu görevi, panelinizdeki "Haftalık Planım" alanından inceleyebilir, süreç içerisindeki ilerlemelerinizi güncelleyebilirsiniz. Çalışmalarınızda başarılar dileriz.

Saygılarımızla,
${firma}`,
    };
  }
}
