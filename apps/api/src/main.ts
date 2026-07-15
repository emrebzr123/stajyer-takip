// ─────────────────────────────────────────────────────────────────────────────
// POLYFILL: Node.js 18'de globalThis.crypto flag'siz mevcut değil (Node 19+'ta
// otomatik gelir). @nestjs/schedule (cron görevleri — teslim hatırlatmaları,
// staj bitiş kontrolü, bildirim temizliği için kullanıyoruz) arka planda
// crypto.randomUUID() çağırıyor; bu olmadan Railway'in Node 18 kullandığı
// ortamlarda uygulama açılışta "crypto is not defined" hatasıyla çöküyordu.
// Bu satırlar, hangi Node sürümü kullanılırsa kullanılsın sorunu kökten çözer.
import { webcrypto } from 'node:crypto';
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // NOT: Express'in varsayılan JSON gövde limiti sadece 100kb — mail eki
  // (base64 kodlanmış dosya, ~%33 daha büyük) bunu kolayca aşar ve "413
  // Payload Too Large" hatası verirdi. 15mb'a çıkarıldı (Brevo'nun kendi
  // eki de ~10MB civarında sınırlıyor, bu yüzden makul bir tavan).
  app.use(json({ limit: '15mb' }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Yüklenen belgelerin (documents) tarayıcıdan indirilebilmesi için
  // uploads klasörünü statik servis et. Bu olmadan belge kaydı oluşuyor
  // ama /uploads/... URL'si 404 veriyordu. Global prefix (api/v1) statik
  // servise uygulanmaz; dosyalar doğrudan http://host:3001/uploads/...
  // adresinden sunulur.
  const uploadDir = join(process.cwd(), process.env.UPLOAD_DEST || './uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
      ];
      // vercel.app domainlerinin tümüne izin ver
      if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.railway.app')) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}

bootstrap();
