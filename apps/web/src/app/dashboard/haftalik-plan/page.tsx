'use client';
import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import InfoBanner from '@/components/layout/InfoBanner';
import StatCard from '@/components/ui/StatCard';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import CircularProgress from '@/components/ui/CircularProgress';
import { tasksApi, internsApi } from '@/lib/api';

// ─── Yardımcı: Görev referans tarihi ──────────────────────────────────────────
const getTaskDate = (t: any): Date => {
  const d = new Date(t.taskStartDate || t.dueDate);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Yardımcı: Tarihin Pazartesi'si ──────────────────────────────────────────
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmt(date: Date): string {
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

// ─── WeekDef tipi ─────────────────────────────────────────────────────────────
interface WeekDef {
  week: number;
  label: string;
  start: Date; // Pazartesi
  end: Date;   // Cuma (dahil)
  display: string;
}

// ─── GLOBAL hafta matrisi ─────────────────────────────────────────────────────
// globalStartDate: tüm sistemdeki EN ESKİ görev tarihi
// Bu tarih bir kez hesaplanır, yeni görev eklense bile değişmez.
function buildGlobalWeeks(globalStartDate: Date): WeekDef[] {
  const monday = getMondayOf(globalStartDate); // 1. Hafta = bu Pazartesi
  return Array.from({ length: 6 }, (_, i) => {
    const start = addDays(monday, i * 7);
    const end   = addDays(start, 4); // Pzt + 4 = Cum
    return {
      week:    i + 1,
      label:   `${i + 1}. Hafta`,
      start,
      end,
      display: `${fmt(start)} – ${fmt(end)}`,
    };
  });
}

// ─── Görevleri global haftalara dağıt ────────────────────────────────────────
// Görevin tarihi hangi haftanın [Pzt, Cum] aralığındaysa oraya gider.
// 6 haftalık pencerenin dışındaki görevler filtrelenir.
function groupIntoGlobalWeeks(tasks: any[], weeks: WeekDef[]): any[][] {
  const slots: any[][] = weeks.map(() => []);
  tasks.forEach((task) => {
    const ref = getTaskDate(task);
    const idx = weeks.findIndex((w) => ref >= w.start && ref <= w.end);
    if (idx >= 0) slots[idx].push(task);
  });
  return slots;
}

// ─── TaskTag ──────────────────────────────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  'Tamamlandı':   'completed',
  'Devam Ediyor': 'in-progress',
  'Beklemede':    'on-hold',
  'Planlandı':    'planned',
  'Gecikmiş':     'delayed',
};
const STATUS_ICONS: Record<string, string> = {
  completed: '✓', 'in-progress': '●', 'on-hold': '●', delayed: '!',
};

function TaskTag({ status, title }: { status: string; title: string }) {
  const cls = STATUS_CLASS[status] || 'planned';
  return (
    <div className={`task-tag ${cls}`} title={title}>
      {STATUS_ICONS[cls] && <span>{STATUS_ICONS[cls]} </span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
        {title}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HaftalikPlanPage() {
  const [allInterns,  setAllInterns]  = useState<any[]>([]);
  const [allTasks,    setAllTasks]    = useState<any[]>([]);
  const [dashStats,   setDashStats]   = useState<any>(null);
  const [internStats, setInternStats] = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      internsApi.getAll({ limit: 100 }),
      tasksApi.getAll({ limit: 500 }),
      tasksApi.getDashboardStats(),
      internsApi.getStats(),
    ]).then(([iRes, tRes, sRes, isRes]) => {
      setAllInterns(iRes.data.data || []);
      setAllTasks(tRes.data.data   || []);
      setDashStats(sRes.data);
      setInternStats(isRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ─── 1. Global başlangıç tarihi: tüm görevlerin en eskisi ─────────────────
  const globalWeeks = useMemo((): WeekDef[] => {
    if (allTasks.length === 0) return [];

    // Tüm görevler içinden EN ESKİ tarihi bul
    const earliest = allTasks.reduce((min, t) => {
      const d = getTaskDate(t);
      return d < min ? d : min;
    }, getTaskDate(allTasks[0]));

    // Bu tarih sistemin miladıdır — yeni görev eklense de değişmez
    return buildGlobalWeeks(earliest);
  }, [allTasks]);

  // ─── 2. Her stajyer için görevleri global haftalara dağıt ─────────────────
  const internPlans = useMemo(() => {
    if (globalWeeks.length === 0) return [];

    return allInterns
      .map((intern) => {
        const internTasks = allTasks.filter(
          (t) => t.internId === intern.id || t.intern?.id === intern.id,
        );
        if (internTasks.length === 0) return null;

        // Aynı global hafta matrisi kullanılır → Ayşe'nin görevi 3. haftaya gider
        const slots = groupIntoGlobalWeeks(internTasks, globalWeeks);

        const completed = internTasks.filter((t) => t.status === 'Tamamlandı').length;
        const progress  = Math.round((completed / internTasks.length) * 100);

        return { intern, slots, progress, totalTasks: internTasks.length };
      })
      .filter(Boolean) as any[];
  }, [allInterns, allTasks, globalWeeks]);

  const filtered = internPlans.filter((p) =>
    !search || p.intern.user?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // ─── Stat kartları ─────────────────────────────────────────────────────────
  const STAT_CARDS = dashStats && internStats
    ? [
        { label: 'Toplam Stajyer',   value: internStats.total ?? '-',              icon: 'users',     color: 'blue',   sub: 'Kayıtlı stajyer' },
        { label: 'Aktif Görev',      value: dashStats.inProgress ?? '-',           icon: 'clipboard', color: 'green',  sub: 'Devam eden' },
        { label: 'Tamamlanan Görev', value: dashStats.completed ?? '-',            icon: 'check',     color: 'purple', sub: 'Tamamlanan' },
        { label: 'Geciken Görev',    value: dashStats.delayed ?? '-',              icon: 'clock',     color: 'red',    sub: 'Gecikmiş' },
        { label: 'Ort. İlerleme',    value: `%${dashStats.averageProgress ?? 0}`,  icon: 'chart',     color: 'orange', sub: 'Ortalama' },
        { label: 'Bu Hafta Teslim',  value: dashStats.dueSoon ?? '-',              icon: 'calendar',  color: 'blue',   sub: 'Bu hafta' },
      ]
    : [];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Stajyer Bazlı 6 Haftalık Görev Planı"
        subtitle="Tüm görevler, sistemdeki ilk görevin haftasından başlayan ortak takvime göre yerleştirilir."
      />

      <div className="stats-row stats-row-6">
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ maxWidth: 320 }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Stajyer ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Global hafta aralığı bilgisi */}
        {globalWeeks.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="calendar" size={14} />
            <span>
              Takvim: <strong>{globalWeeks[0].display}</strong> → <strong>{globalWeeks[5].display}</strong>
            </span>
          </div>
        )}
        <div className="filter-actions" style={{ marginLeft: 'auto' }}>
          <button className="btn-secondary" onClick={load}>
            <Icon name="refresh" size={16} /> Yenile
          </button>
          <button className="btn-secondary">
            <Icon name="download" size={16} /> Dışa Aktar
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="card-title">Stajyer Bazlı 6 Haftalık Görev Planı</span>
          <div className="week-legend">
            {[
              { color: '#22C55E', label: 'Tamamlandı' },
              { color: '#F97316', label: 'Devam Ediyor' },
              { color: '#9333EA', label: 'Beklemede' },
              { color: '#EF4444', label: 'Gecikmiş' },
              { color: '#9CA3AF', label: 'Planlandı' },
            ].map((l) => (
              <span key={l.label} className="week-legend-item">
                <span className="legend-dot" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stajyer</th>
                <th>Bölüm</th>
                {(globalWeeks.length > 0 ? globalWeeks : Array.from({ length: 6 }, (_, i) => ({
                  label: `${i + 1}. Hafta`, display: '',
                }))).map((w: any, i: number) => (
                  <th key={i} style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 600 }}>{w.label}</div>
                    {w.display && (
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400 }}>
                        {w.display}
                      </div>
                    )}
                  </th>
                ))}
                <th>Genel İlerleme</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    Yükleniyor…
                  </td>
                </tr>
              ) : allTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    Henüz hiç görev yok. Tüm görevler silindiğinde tablo sıfırlanır.
                    <br />
                    <small>İş Takip Listesi'nden görev ekleyerek başlayabilirsiniz.</small>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    {search ? 'Arama sonucu bulunamadı.' : 'Görev atanmış stajyer bulunamadı.'}
                  </td>
                </tr>
              ) : (
                filtered.map((plan: any) => (
                  <tr key={plan.intern.id}>
                    <td>
                      <div className="intern-cell">
                        <Avatar name={plan.intern.user?.name || '-'} />
                        <div className="intern-info">
                          <div className="name">{plan.intern.user?.name}</div>
                          <div className="email">{plan.intern.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{plan.intern.department?.name || '-'}</td>
                    {plan.slots.map((weekTasks: any[], wi: number) => (
                      <td key={wi} className="week-cell">
                        {weekTasks.length === 0 ? (
                          <span style={{ color: '#D1D5DB', fontSize: 11 }}>—</span>
                        ) : (
                          weekTasks.map((t: any, ti: number) => (
                            <TaskTag key={ti} status={t.status} title={t.title} />
                          ))
                        )}
                      </td>
                    ))}
                    <td>
                      <CircularProgress value={plan.progress} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>{filtered.length} stajyer listeleniyor</span>
        </div>
      </div>

      <InfoBanner text="Sistemdeki en eski görevin haftası, tüm tablo için kalıcı milat olarak alınır. Yeni görevler bu sabit takvime göre ilgili haftaya yerleştirilir." />
    </>
  );
}
