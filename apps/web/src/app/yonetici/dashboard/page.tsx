'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import StatCard from '@/components/ui/StatCard';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import api, { personnelTasksApi, companiesApi, tasksApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function YoneticiAnaSayfa() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [personelCount, setPersonelCount] = useState<number | null>(null);
  // Sadece sayı değil, tam liste — Ana Sayfa'da personel widget'ında
  // gösterip tıklanabilir yapmak için.
  const [personelList, setPersonelList] = useState<any[]>([]);
  const [stajyerCount, setStajyerCount] = useState<number | null>(null);
  const [pendingTasks, setPendingTasks] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<number | null>(null);

  // "Bu Hafta Bitecek Görevler" — Personel panelindeki Ana Sayfa'yla AYNI
  // widget, aynı veri kaynağı (stajyer görevleri). Bilinçli bir istisna:
  // Yönetici normalde stajyer seviyesindeki günlük görev trafiğini görmez,
  // ama bu özet widget'ı özellikle istendi.
  const [deadlines, setDeadlines] = useState<any[]>([]);

  // Şirkete göre dağılım — her şirket için kaç proje/aktif/tamamlanan görev
  // var. Mevcut CompanyEntity (stajyer ekleme formundaki "Firma" alanıyla
  // AYNI tablo) kullanılıyor.
  const [companyStats, setCompanyStats] = useState<{ id: string; name: string; boardCount: number; active: number; completed: number }[] | null>(null);
  const [uncategorized, setUncategorized] = useState<{ boardCount: number; active: number; completed: number } | null>(null);

  useEffect(() => {
    api.get('/interns', { params: { limit: 1 } }).then((r) => {
      setStajyerCount(r.data?.total ?? 0);
    }).catch(() => setStajyerCount(0));

    tasksApi.getUpcomingDeadlines(50).then((r) => setDeadlines(r.data || [])).catch(() => undefined);

    // Tüm personelin bölümlerini (ve içindeki görevlerini) toplayıp genel
    // bekleyen/tamamlanan sayısını VE şirkete göre dağılımı hesaplıyoruz —
    // ayrı bir "tüm görevler" endpoint'i eklemek yerine mevcut "belirli bir
    // personelin bölümleri" endpoint'ini her personel için paralel
    // çağırıyoruz (personel sayısı az olduğu için performans sorunu olmaz).
    Promise.all([
      api.get('/users'),
      companiesApi.getAll(),
    ]).then(async ([usersRes, companiesRes]) => {
      const managers = (usersRes.data || []).filter((u: any) => u.role === 'manager');
      setPersonelCount(managers.length);
      setPersonelList(managers);
      const companies = companiesRes.data || [];

      const boardsPerPersonel = await Promise.all(
        managers.map((m: any) => personnelTasksApi.getBoardsFor(m.id).then((res) => res.data || []).catch(() => [])),
      );
      const allBoards = boardsPerPersonel.flat();
      const allTasks = allBoards.flatMap((b: any) => b.tasks || []);
      setPendingTasks(allTasks.filter((t: any) => !t.isCompleted).length);
      setCompletedTasks(allTasks.filter((t: any) => t.isCompleted).length);

      // Şirkete göre grupla
      const stats = companies.map((c: any) => {
        const boards = allBoards.filter((b: any) => b.companyId === c.id);
        const tasks = boards.flatMap((b: any) => b.tasks || []);
        return {
          id: c.id, name: c.name, boardCount: boards.length,
          active: tasks.filter((t: any) => !t.isCompleted).length,
          completed: tasks.filter((t: any) => t.isCompleted).length,
        };
      });
      setCompanyStats(stats);

      const noCompanyBoards = allBoards.filter((b: any) => !b.companyId);
      const noCompanyTasks = noCompanyBoards.flatMap((b: any) => b.tasks || []);
      setUncategorized({
        boardCount: noCompanyBoards.length,
        active: noCompanyTasks.filter((t: any) => !t.isCompleted).length,
        completed: noCompanyTasks.filter((t: any) => t.isCompleted).length,
      });
    }).catch(() => {
      setPersonelCount(0); setPendingTasks(0); setCompletedTasks(0);
    });
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>
        Hoş geldiniz, {user?.name || 'Yönetici'} 👋
      </h1>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        Personel ve şirket geneli özet bilgiler burada.
      </p>

      <div className="stats-row stats-row-4">
        <StatCard label="Toplam Personel" value={personelCount ?? '—'} icon="users" color="blue" sub="Kayıtlı personel" />
        <StatCard label="Toplam Stajyer" value={stajyerCount ?? '—'} icon="graduation" color="green" sub="Sistemdeki stajyer" />
        <StatCard label="Bekleyen Görev" value={pendingTasks ?? '—'} icon="clock" color="orange" sub="Personele atanmış, devam eden" />
        <StatCard label="Tamamlanan Görev" value={completedTasks ?? '—'} icon="check" color="purple" sub="Personel tarafından bitirilen" />
      </div>

      {/* Şirkete göre dağılım — "ELECTROMTECH'ten ne, ATN'den ne gelmiş"
          sorusunun cevabı burada, tek bakışta. Diğer iki widget'ın (Bu
          Hafta Bitecek Görevler + Personel) ÜSTÜNDE, çünkü genel şirket
          özeti günlük detaylardan önce görülmeli. */}
      {companyStats && companyStats.length > 0 && (
        <div className="card" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>🏢 Şirkete Göre Dağılım</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {companyStats.map((c) => (
              <div key={c.id} style={{
                flex: '1 1 200px', minWidth: 0, maxWidth: 260, border: '1px solid var(--border)',
                borderRadius: 10, padding: 14, background: '#F8FAFC', overflow: 'hidden',
              }}>
                <div title={c.name} style={{
                  fontWeight: 700, fontSize: 13, marginBottom: 10,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.name}
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#1E3A5F' }}>{c.boardCount}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Proje</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#EA580C' }}>{c.active}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Aktif Görev</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#16A34A' }}>{c.completed}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Tamamlanan</div>
                  </div>
                </div>
              </div>
            ))}
            {uncategorized && uncategorized.boardCount > 0 && (
              <div style={{
                flex: '1 1 200px', minWidth: 0, maxWidth: 260, border: '1px dashed var(--border)',
                borderRadius: 10, padding: 14, background: '#fff',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>Görevler</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#94A3B8' }}>{uncategorized.boardCount}</div>
                    {/* NOT: Bu kart "Şirketsiz" (Görev Ekle ile oluşturulan)
                        kayıtları gösteriyor — burada gerçek anlamda "proje"
                        yok, düz görev var, o yüzden etiket "Görev". Şirket
                        kartlarındaki "Proje" etiketine dokunulmadı. */}
                    <div style={{ color: 'var(--text-secondary)' }}>Görev</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#94A3B8' }}>{uncategorized.active}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Aktif Görev</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#94A3B8' }}>{uncategorized.completed}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Tamamlanan</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bu Hafta Bitecek Görevler + Personel — yan yana, iki sütun.
          İkisi de kendi içinde kayıyor, sayfa uzamıyor. */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: '1 1 320px', minWidth: 0, margin: 0 }}>
          <div className="card-header">
            <span className="card-title">Bu Hafta Bitecek Görevler</span>
          </div>
          {deadlines.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Yaklaşan son tarih yok</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {[...deadlines].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((t: any, i) => (
                <div key={i} className="list-item">
                  <Avatar name={t.intern?.user?.name || '-'} size="md" />
                  <div className="list-item-content">
                    <div className="list-item-title">{t.title}</div>
                    <div className="list-item-sub">{t.intern?.user?.name}</div>
                  </div>
                  <div className="list-item-date">
                    <Icon name="calendar" size={14} />
                    {formatDate(t.dueDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personel — tıklanınca o personel seçili olarak Görevler
            sayfasına gider, projelerini/görevlerini direkt görürsün. */}
        <div className="card" style={{ flex: '1 1 320px', minWidth: 0, margin: 0 }}>
          <div className="card-header">
            <span className="card-title">Personel</span>
          </div>
          {personelList.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Henüz personel yok</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {personelList.map((p) => (
                <div key={p.id} className="list-item"
                  onClick={() => router.push(`/yonetici/dashboard/gorevler?personelId=${p.id}`)}
                  style={{ cursor: 'pointer' }}>
                  <Avatar name={p.name} size="md" />
                  <div className="list-item-content">
                    <div className="list-item-title">{p.name}</div>
                    <div className="list-item-sub">{p.email}</div>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
