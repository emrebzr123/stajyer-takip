import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'intern_tracker',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('🔗 Veritabanına bağlandı');

  const userRepo   = AppDataSource.getRepository('UserEntity');
  const deptRepo   = AppDataSource.getRepository('DepartmentEntity');
  const internRepo = AppDataSource.getRepository('InternEntity');
  const taskRepo   = AppDataSource.getRepository('TaskEntity');

  // Temizle (foreign key sırasına göre)
  await AppDataSource.query('DELETE FROM tasks');
  await AppDataSource.query('DELETE FROM interns');
  await AppDataSource.query('DELETE FROM departments');
  await AppDataSource.query('DELETE FROM users');

  // Departments
  const depts = await deptRepo.save([
    { name: 'Yazılım Geliştirme' },
    { name: 'Veri Analizi' },
    { name: 'Dijital Pazarlama' },
    { name: 'UI/UX Tasarım' },
    { name: 'İnsan Kaynakları' },
  ]);
  console.log('✅ Bölümler eklendi');

  const hash = await bcrypt.hash('password123', 12);

  // NOT: Bu hesap sistem yöneticisi (giriş/login) hesabıdır — 'manager' değil
  // 'admin' rolü kullanılmalı. Önceden 'manager' olarak işaretlendiği için
  // Stajyer Ekle formundaki Mentör listesinde (role === 'manager' filtresiyle)
  // gerçek mentörlerle birlikte görünüyordu. 'admin' yaparak mentör
  // seçeneklerinden çıkarıyoruz; girişte hâlâ kullanılabilir.
  const admin = await userRepo.save({
    email: 'admin@stajyer.com',
    passwordHash: hash,
    name: 'Emre Bozar',
    role: 'admin',
    avatarUrl: 'https://i.pravatar.cc/72?u=zeynep',
  });

  const internUsers = await userRepo.save([
    { email: 'ayse.yilmaz@stajyer.com',  passwordHash: hash, name: 'Ayşe Yılmaz',  role: 'intern' },
    { email: 'mehmet.kaya@stajyer.com',  passwordHash: hash, name: 'Mehmet Kaya',   role: 'intern' },
    { email: 'ali.tunc@stajyer.com',     passwordHash: hash, name: 'Ali Tunç',      role: 'intern' },
    { email: 'irem.demir@stajyer.com',   passwordHash: hash, name: 'İrem Demir',    role: 'intern' },
    { email: 'elif.arslan@stajyer.com',  passwordHash: hash, name: 'Elif Arslan',   role: 'intern' },
    { email: 'eren.koc@stajyer.com',     passwordHash: hash, name: 'Eren Koç',      role: 'intern' },
  ]);
  console.log('✅ Kullanıcılar eklendi');

  const interns = await internRepo.save([
    { user: internUsers[0], userId: internUsers[0].id, department: depts[0], departmentId: depts[0].id, mentor: admin, mentorId: admin.id, term: 'Bahar 2024', status: 'Aktif',   startDate: '2024-05-06', endDate: '2024-06-14' },
    { user: internUsers[1], userId: internUsers[1].id, department: depts[1], departmentId: depts[1].id, mentor: admin, mentorId: admin.id, term: 'Bahar 2024', status: 'Aktif',   startDate: '2024-05-06', endDate: '2024-06-14' },
    { user: internUsers[2], userId: internUsers[2].id, department: depts[3], departmentId: depts[3].id, mentor: admin, mentorId: admin.id, term: 'Bahar 2024', status: 'Aktif',   startDate: '2024-05-06', endDate: '2024-06-14' },
    { user: internUsers[3], userId: internUsers[3].id, department: depts[2], departmentId: depts[2].id, mentor: admin, mentorId: admin.id, term: 'Bahar 2024', status: 'Aktif',   startDate: '2024-05-06', endDate: '2024-06-14' },
    { user: internUsers[4], userId: internUsers[4].id, department: depts[3], departmentId: depts[3].id, mentor: admin, mentorId: admin.id, term: 'Bahar 2024', status: 'Aktif',   startDate: '2024-05-06', endDate: '2024-06-14' },
    { user: internUsers[5], userId: internUsers[5].id, department: depts[1], departmentId: depts[1].id, mentor: admin, mentorId: admin.id, term: 'Bahar 2024', status: 'Aktif',   startDate: '2024-05-06', endDate: '2024-06-14' },
  ]);
  console.log('✅ Stajyerler eklendi');

  const today = new Date();
  const f = (d: number) => { const x = new Date(today); x.setDate(x.getDate()+d); return x.toISOString().split('T')[0]; };
  const p = (d: number) => { const x = new Date(today); x.setDate(x.getDate()-d); return x.toISOString().split('T')[0]; };

  await taskRepo.save([
    { title: 'Test ve Hata Düzeltme',    description: 'Yazılım modülündeki hataların giderilmesi',           intern: interns[0], internId: interns[0].id, department: depts[0], departmentId: depts[0].id, priority: 'Yüksek', status: 'Devam Ediyor', progress: 67,  dueDate: f(3)  },
    { title: 'Veri Analizi Raporu',      description: 'Pazar araştırması verilerinin analizi',               intern: interns[1], internId: interns[1].id, department: depts[1], departmentId: depts[1].id, priority: 'Orta',   status: 'Devam Ediyor', progress: 58,  dueDate: f(4)  },
    { title: 'UI Tasarım Çalışmaları',   description: 'Yeni modül arayüz tasarımlarının oluşturulması',     intern: interns[2], internId: interns[2].id, department: depts[3], departmentId: depts[3].id, priority: 'Orta',   status: 'Beklemede',    progress: 40,  dueDate: f(5)  },
    { title: 'İçerik Planlama',          description: 'Sosyal medya içerik takviminin oluşturulması',       intern: interns[3], internId: interns[3].id, department: depts[2], departmentId: depts[2].id, priority: 'Orta',   status: 'Gecikmiş',     progress: 30,  dueDate: p(2)  },
    { title: 'Müşteri Anketi',           description: 'Müşteri memnuniyet anketi hazırlama',                intern: interns[4], internId: interns[4].id, department: depts[2], departmentId: depts[2].id, priority: 'Yüksek', status: 'Devam Ediyor', progress: 55,  dueDate: f(7)  },
    { title: 'Veritabanı Optimizasyonu', description: 'Sorgu performansının iyileştirilmesi',               intern: interns[5], internId: interns[5].id, department: depts[1], departmentId: depts[1].id, priority: 'Orta',   status: 'Devam Ediyor', progress: 45,  dueDate: f(9)  },
    { title: 'Veri Toplama',             description: 'Pazar araştırması için veri toplama',                intern: interns[1], internId: interns[1].id, department: depts[1], departmentId: depts[1].id, priority: 'Düşük',  status: 'Tamamlandı',   progress: 100, dueDate: p(1)  },
    { title: 'Oryantasyon Programı',     description: 'Yeni stajyerler için oryantasyon',                   intern: interns[4], internId: interns[4].id, department: depts[4], departmentId: depts[4].id, priority: 'Düşük',  status: 'Tamamlandı',   progress: 100, dueDate: p(5)  },
    { title: 'API Entegrasyonu',         description: 'Üçüncü parti API entegrasyonu',                      intern: interns[0], internId: interns[0].id, department: depts[0], departmentId: depts[0].id, priority: 'Yüksek', status: 'Planlandı',    progress: 0,   dueDate: f(13) },
    { title: 'Landing Page Tasarımı',    description: 'Yeni ürün landing page tasarımı',                    intern: interns[2], internId: interns[2].id, department: depts[3], departmentId: depts[3].id, priority: 'Yüksek', status: 'Beklemede',    progress: 20,  dueDate: f(11) },
  ]);
  console.log('✅ Görevler eklendi');

  await AppDataSource.destroy();
  console.log('\n🎉 Seed tamamlandı! Giriş: admin@stajyer.com / password123');
}

seed().catch((e) => {
  console.error('❌ Seed hatası:', e);
  process.exit(1);
});
