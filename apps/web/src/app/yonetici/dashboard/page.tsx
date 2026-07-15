'use client';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import StatCard from '@/components/ui/StatCard';
import api, { personnelTasksApi, companiesApi } from '@/lib/api';

export default function YoneticiAnaSayfa() {
  const { user } = useAuthStore();
  const [personelCount, setPersonelCount] = useState<number | null>(null);
  const [stajyerCount, setStajyerCount] = useState<number | null>(null);
  const [pendingTasks, setPendingTasks] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<number | null>(null);

  // Şirkete göre dağılım — her şirket için kaç proje/aktif/tamamlanan görev
  // var. Mevcut CompanyEntity (stajyer ekleme formundaki "Firma" alanıyla
  // AYNI tablo) kullanılıyor.
  const [companyStats, setCompanyStats] = useState<{ id: string; name: string; boardCount: number; active: number; completed: number }[] | null>(null);
  const [uncategorized, setUncategorized] = useState<{ boardCount: number; active: number; completed: number } | null>(null);

  useEffect(() => {
    api.get('/interns', { params: { limit: 1 } }).then((r) => {
      setStajyerCount(r.data?.total ?? 0);
    }).catch(() => setStajyerCount(0));

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
          sorusunun cevabı burada, tek bakışta. */}
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
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>Şirketsiz Projeler</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#94A3B8' }}>{uncategorized.boardCount}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Proje</div>
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
    </div>
  );
}
