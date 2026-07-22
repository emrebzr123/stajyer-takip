'use client';
import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import InfoBanner from '@/components/layout/InfoBanner';
import StatCard from '@/components/ui/StatCard';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import CircularProgress from '@/components/ui/CircularProgress';
import { tasksApi, internsApi } from '@/lib/api';
import {
  buildCalendarWeeks, groupTasksIntoWeeks, internWeekNumber, weekInInternship, WeekDef,
} from '@/lib/weeks';
import { exportToExcel } from '@/lib/export';

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

function TaskTag({ status, title, isFinalWeek = true }: { status: string; title: string; isFinalWeek?: boolean }) {
  const cls = STATUS_CLASS[status] || 'planned';
  return (
    <div className={`task-tag ${cls}${isFinalWeek ? '' : ' spanning'}`} title={isFinalWeek ? title : `${title} (devam ediyor — teslim başka haftada)`}>
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

  // ─── GERÇEK TAKVİM EKSENİ ──────────────────────────────────────────────────
  // Tüm satırlar AYNI sütun tarihlerini paylaşır — yönetici "bu hafta kimde ne
  // var?" sorusunu tek bakışta yanıtlar. Pencere varsayılan olarak geçen
  // haftadan başlar (1 geçmiş + 5 gelecek hafta) ve ‹ › oklarıyla kaydırılır;
  // eski "sistemdeki en eski görev" miladı gibi zamanla bayatlamaz. Stajyerin
  // KENDİ hafta numarası hücre içinde rozet olarak gösterilir — stajyer
  // panelindeki "N. Hafta" ile aynı milat (startDate) kullanıldığı için
  // numaralar iki panelde her zaman tutarlıdır.
  const [weekOffset, setWeekOffset] = useState(-1); // -1 = geçen haftadan başla

  const calendarWeeks = useMemo(() => buildCalendarWeeks(weekOffset, 6), [weekOffset]);

  const internPlans = useMemo(() => {
    return allInterns
      .map((intern) => {
        const internTasks = allTasks.filter(
          (t) => t.internId === intern.id || t.intern?.id === intern.id,
        );
        if (internTasks.length === 0 && !intern.startDate) return null;

        // clamp=false: pencere dışındaki görevler kenetlenmez; oklarla
        // kaydırınca ait oldukları gerçek haftada görünürler.
        const slots = groupTasksIntoWeeks(internTasks, calendarWeeks, false);

        const completed = internTasks.filter((t) => t.status === 'Tamamlandı').length;
        const progress  = internTasks.length ? Math.round((completed / internTasks.length) * 100) : 0;

        return { intern, slots, progress, totalTasks: internTasks.length };
      })
      .filter(Boolean) as any[];
  }, [allInterns, allTasks, calendarWeeks]);

  const filtered = internPlans.filter((p) =>
    !search || p.intern.user?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  // Excel dışa aktarma: görünür takvim penceresinin hafta-hafta özeti
  const handleExport = () => {
    const rows = filtered.map((p: any) => {
      const row: Record<string, any> = {
        'Kişi': p.intern.user?.name || '-',
        'Bölüm': p.intern.department?.name || '-',
        'Başlangıç': p.intern.startDate || '-',
        'Bitiş': p.intern.endDate || '-',
      };
      calendarWeeks.forEach((w, i) => {
        const wk = internWeekNumber(p.intern.startDate, w.start);
        const header = `${w.display}${wk ? ` (${wk}. çalışma haftası)` : ''}`;
        row[header] = p.slots[i].map((t: any) => `${t.title} [${t.status}]`).join(', ') || '-';
      });
      row['Genel İlerleme (%)'] = p.progress;
      return row;
    });
    exportToExcel(rows, 'haftalik-gorev-plani', 'Haftalık Plan');
  };

  // ─── Stat kartları ─────────────────────────────────────────────────────────
  const STAT_CARDS = dashStats && internStats
    ? [
        { label: 'Toplam Kişi',      value: internStats.total ?? '-',              icon: 'users',     color: 'blue',   sub: 'Kayıtlı kişi' },
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
        title="Kişi Bazlı Haftalık Çalışma Planı"
        subtitle="Tüm ekip ortak takvim ekseninde — hücrelerdeki rozet, o haftanın kişinin kaçıncı çalışma haftası olduğunu gösterir."
      />

      <div className="stats-row stats-row-6">
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ maxWidth: 320 }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Kişi ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Hafta gezinme: ‹ geçmiş, › gelecek, Bugün = pencereyi sıfırla */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn-secondary" onClick={() => setWeekOffset(o => o - 1)} title="Önceki hafta" style={{ padding: '6px 10px' }}>
            <Icon name="chevronLeft" size={14} />
          </button>
          <button className="btn-secondary" onClick={() => setWeekOffset(-1)} style={{ padding: '6px 12px', fontSize: 12 }}>
            Bugün
          </button>
          <button className="btn-secondary" onClick={() => setWeekOffset(o => o + 1)} title="Sonraki hafta" style={{ padding: '6px 10px' }}>
            <Icon name="chevronRight" size={14} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>
            {calendarWeeks[0]?.display} → {calendarWeeks[calendarWeeks.length - 1]?.display}
          </span>
        </div>
        <div className="filter-actions" style={{ marginLeft: 'auto' }}>
          <button className="btn-secondary" onClick={load}>
            <Icon name="refresh" size={16} /> Yenile
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Dışa Aktar
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="card-title">Kişi Bazlı 6 Haftalık Çalışma Planı</span>
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

        {/* NOT: Global .table-wrap class'ı 8 farklı sayfada kullanılıyor,
            ona dokunmadık (başka sayfaları etkilemesin diye). Bu tabloya
            özel dikey kaydırma sınırı SADECE burada, inline stil ile
            ekleniyor — yatay kaydırma zaten class'tan geliyor. */}
        <div className="table-wrap" style={{ maxHeight: 600, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, zIndex: 2 }}>Kişi</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2 }}>Bölüm</th>
                {calendarWeeks.map((w, i) => (
                  <th key={i} style={{ minWidth: 140, background: w.isCurrent ? '#EFF6FF' : undefined, position: 'sticky', top: 0, zIndex: 2 }}>
                    <div style={{ fontWeight: 600, color: w.isCurrent ? 'var(--primary)' : undefined }}>
                      {w.isCurrent ? '📍 Bu Hafta' : w.display}
                    </div>
                    {w.isCurrent && (
                      <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 400 }}>{w.display}</div>
                    )}
                  </th>
                ))}
                <th style={{ position: 'sticky', top: 0, zIndex: 2 }}>Genel İlerleme</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={calendarWeeks.length + 3} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    Yükleniyor…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={calendarWeeks.length + 3} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    {search ? 'Arama sonucu bulunamadı.' : 'Görev atanmış veya başlangıç tarihi girilmiş kişi bulunamadı.'}
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
                          <div className="email">
                            {plan.intern.startDate
                              ? `Başlangıç: ${new Date(plan.intern.startDate).toLocaleDateString('tr-TR')}`
                              : plan.intern.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{plan.intern.department?.name || '-'}</td>
                    {calendarWeeks.map((week, wi) => {
                      const inPeriod = weekInInternship(plan.intern.startDate, plan.intern.endDate, week);
                      const weekTasks = plan.slots[wi] || [];
                      // Staj dönemi DIŞI: gri hücre (başlamadı ya da bitti)
                      if (!inPeriod) {
                        return (
                          <td key={wi} className="week-cell" style={{ background: '#FAFAFA' }}
                            title="Bu hafta kişinin çalışma dönemi dışında">
                            <span style={{ color: '#E5E7EB', fontSize: 11 }}>·</span>
                          </td>
                        );
                      }
                      const wk = internWeekNumber(plan.intern.startDate, week.start);
                      return (
                        <td
                          key={wi}
                          className="week-cell"
                          style={week.isCurrent ? { background: '#F5F9FF' } : undefined}
                        >
                          {/* Stajyerin kendi hafta numarası — stajyer panelindeki
                              "N. Hafta" ile aynı milat, her zaman senkron */}
                          {wk !== null && (
                            <div style={{
                              fontSize: 9, fontWeight: 700, marginBottom: 3,
                              color: week.isCurrent ? 'var(--primary)' : '#B0B8C4',
                            }}>
                              {wk}. çalışma haftası
                            </div>
                          )}
                          {weekTasks.length === 0 ? (
                            <span style={{ color: '#D1D5DB', fontSize: 11 }}>—</span>
                          ) : (
                            weekTasks.map((t: any, ti: number) => (
                              <TaskTag key={ti} status={t.status} title={t.title} isFinalWeek={t.__isFinalWeek !== false} />
                            ))
                          )}
                        </td>
                      );
                    })}
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
          <span>{filtered.length} kişi listeleniyor</span>
        </div>
      </div>

      <InfoBanner text="Sütunlar gerçek takvim haftalarıdır ve tüm ekip için ortaktır; ‹ › oklarıyla geçmişe/geleceğe kaydırabilirsiniz. Hücredeki 'N. çalışma haftası' rozeti, kişinin kendi panelindeki 'Haftalık Planım' ile aynı numaralandırmayı kullanır (milat: başlangıç tarihi). Gri hücreler kişinin dönem dışıdır. Başlangıç tarihi girilmiş çok haftalık görevler, teslim haftasına kadar her haftada soluk/kesikli olarak görünür — dolu rozet asıl teslim haftasını gösterir." />
    </>
  );
}
