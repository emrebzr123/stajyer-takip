'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import InfoBanner from '@/components/layout/InfoBanner';
import Avatar from '@/components/ui/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import DonutChart from '@/components/charts/DonutChart';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import GaugeChart from '@/components/charts/GaugeChart';
import { tasksApi, internsApi } from '@/lib/api';
import { exportToExcel } from '@/lib/export';
import toast from 'react-hot-toast';

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function getCurrentMonthRange() {
  const now   = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt   = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(first), end: fmt(last) };
}

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// NOT: Önceden bu sayfada yerel bir exportToCSV fonksiyonu vardı; İş Takip,
// Stajyerler ve Haftalık Plan sayfaları ise ortak lib/export.ts üzerinden
// gerçek .xlsx indiriyordu. Tutarsızlık: aynı uygulamada bazı "Dışa Aktar"
// butonları Excel, bazıları düz metin (.csv) üretiyordu. Artık hepsi aynı
// exportToExcel yardımcısını kullanıyor.

// ─── İlerleme dağılımı (statik) ───────────────────────────────────────────────
const PROGRESS_DIST = [
  { range: '0-25%',   count: 2, color: '#EF4444' },
  { range: '26-50%',  count: 4, color: '#F97316' },
  { range: '51-75%',  count: 7, color: '#3B82F6' },
  { range: '76-100%', count: 5, color: '#22C55E' },
];

const COLOR_MAP: Record<string, string> = {
  'Tamamlandı':   '#22C55E',
  'Devam Ediyor': '#F97316',
  'Beklemede':    '#9333EA',
  'Gecikmiş':     '#EF4444',
  'Planlandı':    '#9CA3AF',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function RaporlarPage() {
  const def = getCurrentMonthRange();

  // Ham veri
  const [allTasks,    setAllTasks]    = useState<any[]>([]);
  const [allInterns,  setAllInterns]  = useState<any[]>([]);
  const [trend,       setTrend]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Filtreler
  const [dateStart,     setDateStart]     = useState(def.start);
  const [dateEnd,       setDateEnd]       = useState(def.end);
  const [deptFilter,    setDeptFilter]    = useState('');
  const [internFilter,  setInternFilter]  = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, iRes, trRes] = await Promise.all([
        tasksApi.getAll({ limit: 1000 }),
        internsApi.getAll({ limit: 200 }),
        tasksApi.getCompletionTrend(),
      ]);
      setAllTasks(tRes.data.data   || []);
      setAllInterns(iRes.data.data || []);
      setTrend(trRes.data          || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Filtre seçenekleri ────────────────────────────────────────────────────
  // NOT: Önceden bölüm/stajyer filtreleri İSİM string'i üzerinden
  // çalışıyordu (deptFilter === 'Yazılım Geliştirme' gibi). İki stajyerin
  // adı aynıysa (örn. iki "Mehmet") ya da bir bölüm adı sonradan
  // değiştirilirse filtre yanlış eşleşebiliyordu. Artık ID kullanılıyor;
  // isim sadece dropdown'da GÖRÜNTÜLEME için tutuluyor.
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    allInterns.forEach((i) => {
      if (i.department?.id) map.set(i.department.id, i.department.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allInterns]);

  // ─── Ana filtre: tüm kartlar ve grafikler bu veriyi kullanır ───────────────
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      // Tarih aralığı — dueDate bazlı
      if (dateStart && t.dueDate && t.dueDate < dateStart) return false;
      if (dateEnd   && t.dueDate && t.dueDate > dateEnd)   return false;

      // Bölüm filtresi — task.departmentId veya intern.departmentId (ID bazlı)
      if (deptFilter) {
        const taskDeptId   = t.departmentId   || t.department?.id   || '';
        const internDeptId = t.intern?.departmentId || t.intern?.department?.id || '';
        if (taskDeptId !== deptFilter && internDeptId !== deptFilter) return false;
      }

      // Stajyer filtresi — internId (ID bazlı)
      if (internFilter && t.internId !== internFilter && t.intern?.id !== internFilter) return false;

      // Görev durumu filtresi
      if (statusFilter && t.status !== statusFilter) return false;

      return true;
    });
  }, [allTasks, dateStart, dateEnd, deptFilter, internFilter, statusFilter]);

  // ─── Durum dağılımı (donut) ───────────────────────────────────────────────
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    return Object.entries(counts).map(([label, count]) => ({
      label, count,
      pct: total ? Math.round((count / total) * 100) : 0,
      color: COLOR_MAP[label] || '#9CA3AF',
    }));
  }, [filteredTasks]);

  // ─── Bölüm dağılımı (bar) ────────────────────────────────────────────────
  const deptDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      const name = t.department?.name || t.intern?.department?.name || 'Diğer';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filteredTasks]);

  // ─── Özet istatistikler ───────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total     = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.status === 'Tamamlandı').length;
    const ongoing   = filteredTasks.filter((t) => t.status === 'Devam Ediyor').length;
    const overdue   = filteredTasks.filter((t) => t.isOverdue || t.status === 'Gecikmiş').length;
    const avgProg   = total
      ? Math.round(filteredTasks.reduce((s, t) => s + (t.progress || 0), 0) / total)
      : 0;

    // Filtrelenmiş intern'ler
    const internIds = new Set(filteredTasks.map((t) => t.internId || t.intern?.id));
    const totalInterns = deptFilter || internFilter
      ? internIds.size
      : allInterns.length;

    // En aktif stajyer
    const perfMap: Record<string, { name: string; completed: number; total: number }> = {};
    filteredTasks.forEach((t) => {
      const name = t.intern?.user?.name || 'Bilinmiyor';
      if (!perfMap[name]) perfMap[name] = { name, completed: 0, total: 0 };
      perfMap[name].total++;
      if (t.status === 'Tamamlandı') perfMap[name].completed++;
    });
    const top = Object.values(perfMap).sort((a, b) => b.completed - a.completed)[0];

    return { total, completed, ongoing, overdue, avgProg, totalInterns, top };
  }, [filteredTasks, allInterns, deptFilter, internFilter]);

  // ─── Performans tablosu ───────────────────────────────────────────────────
  const perfRows = useMemo(() => {
    const map: Record<string, any> = {};
    filteredTasks.forEach((t) => {
      const name = t.intern?.user?.name || 'Bilinmiyor';
      if (!map[name]) map[name] = { name, completed: 0, ongoing: 0, overdue: 0, progSum: 0, count: 0 };
      map[name].count++;
      map[name].progSum += t.progress || 0;
      if (t.status === 'Tamamlandı') map[name].completed++;
      else if (t.status === 'Devam Ediyor') map[name].ongoing++;
      if (t.isOverdue || t.status === 'Gecikmiş') map[name].overdue++;
    });
    return Object.values(map).map((r: any) => ({
      ...r,
      avgProg: Math.round(r.progSum / r.count),
      // NOT: Önceki formül `completed / (completed + ongoing)` idi — bu,
      // Gecikmiş/Beklemede/Planlandı görevleri paydadan TAMAMEN dışlıyordu.
      // Sonuç: 3 görevi gecikmiş, 2 görevi tamamlanmış bir stajyer "%100
      // tamamlama oranı" gösterebiliyordu (2/(2+0)=100%), çünkü gecikmiş
      // görevler hiç sayılmıyordu. Doğrusu: tamamlanan / TÜM görevler.
      rate: r.count > 0 ? Math.round((r.completed / r.count) * 100) : 0,
    })).sort((a, b) => b.completed - a.completed);
  }, [filteredTasks]);

  // ─── Trend ───────────────────────────────────────────────────────────────
  const trendLabels = trend.map((t: any) =>
    new Date(t.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
  );
  const trendValues = trend.map((t: any) => parseInt(t.value));

  // ─── Dışa Aktar ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!perfRows.length) { toast('Aktarılacak veri yok.', { icon: 'ℹ️' }); return; }
    // deptFilter/internFilter artık ID tutuyor (bkz. yukarıdaki not) — dışa
    // aktarılan dosyada ham UUID değil, okunur isim görünsün diye çeviriyoruz.
    const deptFilterName   = departments.find((d) => d.id === deptFilter)?.name || 'Tümü';
    const internFilterName = allInterns.find((i: any) => i.id === internFilter)?.user?.name || 'Tümü';
    const rows = perfRows.map((p) => ({
      'Stajyer':              p.name,
      'Tamamlanan':           p.completed,
      'Devam Eden':           p.ongoing,
      'Ort. İlerleme (%)':    p.avgProg,
      'Geciken':              p.overdue,
      'Tamamlama Oranı (%)':  p.rate,
      'Tarih Aralığı':        `${fmtDate(dateStart)} - ${fmtDate(dateEnd)}`,
      'Bölüm Filtresi':       deptFilterName,
      'Stajyer Filtresi':     internFilterName,
      'Durum Filtresi':       statusFilter || 'Tümü',
    }));
    exportToExcel(rows, `stajyer-raporu_${dateStart}_${dateEnd}`, 'Performans Raporu');
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          .sidebar, .mobile-topbar, .no-print { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .page-wrapper { padding: 0 !important; }
          body { background: white !important; }
          .card { break-inside: avoid; box-shadow: none !important; border: 1px solid #E5E7EB !important; }
        }
      `}</style>

      <PageHeader
        title="Raporlar"
        subtitle="Stajyer performanslarını, görev süreçlerini ve genel istatistikleri analiz edin."
        btnText="Rapor Yazdır / PDF"
        btnIcon="download"
        onBtnClick={() => window.print()}
      />

      {/* Stat kartları */}
      <div className="stats-row stats-row-5">
        {[
          { label: 'Toplam Stajyer',    value: summary.totalInterns,            sub: 'Kayıtlı stajyer',     color: 'blue',   icon: 'users' },
          { label: 'Tamamlanan Görev',  value: summary.completed,               sub: 'Bu dönem',            color: 'green',  icon: 'check',
            trend: summary.completed > 0 ? `+%${Math.round((summary.completed/Math.max(1,summary.total))*100)}` : undefined, trendType: 'up-green' },
          { label: 'Ortalama İlerleme', value: `%${summary.avgProg}`,           sub: 'Tüm stajyerler',      color: 'orange', icon: 'clock',
            trend: summary.avgProg > 0 ? `%${summary.avgProg}` : undefined, trendType: 'up-green' },
          { label: 'Süresi Geçen Görev',value: summary.overdue,                 sub: 'Bu dönem',            color: 'purple', icon: 'timer',
            trend: summary.overdue > 0 ? `${summary.overdue} adet` : undefined, trendType: 'up-red' },
          { label: 'En Aktif Stajyer',  value: summary.top?.name || '-',        sub: summary.top ? `${summary.top.completed} görev tamamladı` : 'Veri yok', color: 'red', icon: 'trophy', small: true },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">{s.label}</span>
              <div className={`stat-icon ${s.color}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon==='users'  && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                  {s.icon==='check'  && <polyline points="20 6 9 17 4 12"/>}
                  {(s.icon==='clock'||s.icon==='timer') && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
                  {s.icon==='trophy' && <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>}
                </svg>
              </div>
            </div>
            <div className={`stat-value${(s as any).small ? ' small' : ''}`}>{s.value}</div>
            <div className="stat-footer">
              <span className="stat-subtext">{s.sub}</span>
              {s.trend && <span className={`trend ${s.trendType}`}>{s.trend}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filtre bar */}
      <div className="filter-bar no-print">
        {/* Tarih aralığı */}
        <div className="date-range" style={{ gap: 6 }}>
          <input type="date" value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            style={{ border:'none', background:'transparent', fontSize:13, outline:'none' }} />
          <span style={{ color:'var(--text-secondary)' }}>–</span>
          <input type="date" value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            style={{ border:'none', background:'transparent', fontSize:13, outline:'none' }} />
        </div>

        {/* Bölüm — filteredTasks'i tetikler */}
        <select className="filter-select" value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">Bölüm: Tümü</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Stajyer */}
        <select className="filter-select" value={internFilter}
          onChange={(e) => setInternFilter(e.target.value)}>
          <option value="">Stajyer: Tümü</option>
          {allInterns.map((i: any) => (
            <option key={i.id} value={i.id}>{i.user?.name}</option>
          ))}
        </select>

        {/* Görev durumu — filteredTasks'i tetikler */}
        <select className="filter-select" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Görev Durumu: Tümü</option>
          {['Planlandı','Devam Ediyor','Beklemede','Tamamlandı','Gecikmiş'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <div className="filter-actions">
          <button className="btn-secondary" onClick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Dışa Aktar (.xlsx)
          </button>
        </div>
      </div>

      {/* Grafikler */}
      <div className="grid-3">
        <div className="card">
          <div className="card-header"><span className="card-title">Görev Durum Dağılımı</span></div>
          {statusDistribution.length > 0 ? (
            <DonutChart data={statusDistribution} total={summary.total} centerLabel="Toplam Görev" />
          ) : (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
              {loading ? 'Yükleniyor…' : 'Seçili filtrede veri yok'}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Bölümlere Göre Görev Dağılımı</span></div>
          {deptDistribution.length > 0 ? (
            <BarChart labels={deptDistribution.map(d=>d.name)} values={deptDistribution.map(d=>d.count)} />
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
              {loading ? 'Yükleniyor…' : 'Seçili filtrede veri yok'}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">İlerleme Dağılımı</span></div>
          <GaugeChart distribution={PROGRESS_DIST} average={summary.avgProg} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stajyer Performans Raporu</span>
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
              {fmtDate(dateStart)} – {fmtDate(dateEnd)}
            </span>
          </div>
          <div className="table-wrap">
            <table className="perf-table">
              <thead>
                <tr>
                  <th>Stajyer</th><th>Tamamlanan</th><th>Devam Eden</th>
                  <th>Ort. İlerleme</th><th>Geciken</th><th>Tamamlama Oranı</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'var(--text-secondary)' }}>Yükleniyor…</td></tr>
                ) : perfRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'var(--text-secondary)' }}>Seçili filtrede veri bulunamadı.</td></tr>
                ) : (
                  perfRows.map((p, i) => (
                    <tr key={i}>
                      <td><div className="intern-cell"><Avatar name={p.name} size="sm" /><span style={{ fontWeight:500 }}>{p.name}</span></div></td>
                      <td>{p.completed}</td>
                      <td>{p.ongoing}</td>
                      <td><strong>%{p.avgProg}</strong></td>
                      <td>{p.overdue}</td>
                      <td>
                        <div className="perf-progress">
                          <ProgressBar value={p.rate} color="#22C55E" />
                          <span style={{ fontSize:12, fontWeight:600 }}>{p.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Görev Tamamlama Trendi</span></div>
          {trendLabels.length > 0 ? (
            <LineChart labels={trendLabels} values={trendValues} />
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
              {loading ? 'Yükleniyor…' : 'Henüz tamamlanan görev yok.'}
            </div>
          )}
        </div>
      </div>

      <InfoBanner text="Tüm grafikler ve kartlar seçilen filtreler değiştiğinde anlık güncellenir. Dışa aktarılan dosya gerçek bir Excel (.xlsx) dosyasıdır — Excel ve WPS Office'de doğrudan, kodlama sorunu olmadan açılır." />
    </>
  );
}
