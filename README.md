# 📋 Stajyer Takip Sistemi

Stajyer ve görev yönetimi için production-ready full-stack web uygulaması.

## 🏗 Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | NestJS + TypeORM |
| Veritabanı | PostgreSQL 16 |
| Auth | JWT (Passport.js) |
| Stil | Custom CSS (prototipten birebir) |
| Charts | Chart.js + react-chartjs-2 |
| State | Zustand |
| Monorepo | pnpm workspaces |

## 📁 Proje Yapısı

```
intern-tracker/
├── apps/
│   ├── web/          # Next.js 14 Frontend (port 3000)
│   └── api/          # NestJS Backend     (port 3001)
└── packages/
    └── shared/       # Ortak TypeScript tipleri
```

## 🚀 Hızlı Başlangıç

### Ön Koşullar
- Node.js ≥ 20
- pnpm ≥ 8
- PostgreSQL 16 **veya** Docker

---

### Yöntem 1 — Docker ile (Önerilen)

```bash
# Repoyu klonla
git clone <repo-url>
cd intern-tracker

# Tüm servisleri başlat
docker compose up -d

# Seed verileri yükle (ilk kurulumda)
docker compose exec api pnpm seed
```

Uygulama: http://localhost:3000

---

### Yöntem 2 — Manuel Kurulum

#### 1. Bağımlılıkları yükle
```bash
npm install -g pnpm
pnpm install
```

#### 2. PostgreSQL veritabanı oluştur
```sql
CREATE DATABASE intern_tracker;
```

#### 3. Backend env dosyasını hazırla
```bash
cp apps/api/.env.example apps/api/.env
# .env dosyasını düzenle (DB_PASSWORD vb.)
```

#### 4. Frontend env dosyasını hazırla
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

#### 5. Seed verilerini yükle
```bash
cd apps/api
npx ts-node src/database/seed.ts
cd ../..
```

#### 6. Geliştirme sunucularını başlat
```bash
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1

---

## 🔑 Demo Giriş Bilgileri

| Alan | Değer |
|------|-------|
| E-posta | `admin@stajyer.com` |
| Şifre | `password123` |

---

## 📡 API Endpoint'leri

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/auth/login` | Giriş yap |
| POST | `/api/v1/auth/register` | Kayıt ol |
| GET | `/api/v1/auth/me` | Mevcut kullanıcı |

### Stajyerler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/interns` | Listele (sayfalama + filtre) |
| POST | `/api/v1/interns` | Yeni stajyer |
| PATCH | `/api/v1/interns/:id` | Güncelle |
| DELETE | `/api/v1/interns/:id` | Sil |
| GET | `/api/v1/interns/stats` | İstatistikler |

### Görevler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/tasks` | Listele (sayfalama + filtre) |
| POST | `/api/v1/tasks` | Yeni görev |
| PATCH | `/api/v1/tasks/:id` | Güncelle |
| DELETE | `/api/v1/tasks/:id` | Sil |
| GET | `/api/v1/tasks/stats/dashboard` | Dashboard istatistikleri |
| GET | `/api/v1/tasks/stats/status-distribution` | Durum dağılımı |
| GET | `/api/v1/tasks/stats/completion-trend` | Tamamlama trendi |
| GET | `/api/v1/tasks/stats/intern-progress` | Stajyer ilerlemeleri |
| GET | `/api/v1/tasks/stats/activities` | Son aktiviteler |
| GET | `/api/v1/tasks/stats/upcoming-deadlines` | Yaklaşan son tarihler |

### Raporlar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/reports/summary` | Özet rapor |
| GET | `/api/v1/reports/performance` | Performans raporu |
| GET | `/api/v1/reports/completion-trend` | Tamamlama trendi |
| GET | `/api/v1/reports/department-distribution` | Bölüm dağılımı |

### Diğer
- `/api/v1/departments` — Bölüm CRUD
- `/api/v1/weekly-plans` — Haftalık plan CRUD
- `/api/v1/documents` — Doküman yükleme
- `/api/v1/announcements` — Duyuru CRUD
- `/api/v1/users` — Kullanıcı yönetimi

---

## 🛡 Kullanıcı Rolleri

| Rol | Yetki |
|-----|-------|
| `admin` | Tam yetki |
| `manager` | Stajyer/görev ekleme, raporlar |
| `intern` | Kendi görevlerini görme |

---

## 🔧 Ortam Değişkenleri

### Backend (`apps/api/.env`)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=intern_tracker
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## 📦 Sayfalar

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Giriş | `/auth/login` | JWT kimlik doğrulama |
| Ana Sayfa | `/dashboard` | İstatistikler, grafikler, aktiviteler |
| Stajyerler | `/dashboard/stajyerler` | CRUD, filtreleme, sayfalama |
| İş Takip | `/dashboard/is-takip` | Görev yönetimi |
| Haftalık Plan | `/dashboard/haftalik-plan` | 6 haftalık plan tablosu |
| Raporlar | `/dashboard/raporlar` | Grafikler, performans analizi |
| Takvim | `/dashboard/takvim` | Yakında |
| Duyurular | `/dashboard/duyurular` | Duyuru yönetimi |
| Ayarlar | `/dashboard/ayarlar` | Kullanıcı tercihleri |
