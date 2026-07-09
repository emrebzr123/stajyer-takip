'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import InfoBanner from '@/components/layout/InfoBanner';
import StatCard from '@/components/ui/StatCard';
import Avatar from '@/components/ui/Avatar';
import ProgressBar from '@/components/ui/ProgressBar';
import Icon from '@/components/ui/Icon';
import DonutChart from '@/components/charts/DonutChart';
import { tasksApi, internsApi } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/utils';

export default function DashboardPage() {
  const [dashStats, setDashStats]       = useState<any>(null);
  const [internStats, setInternStats]   = useState<any>(null);
  const [statusDist, setStatusDist]     = useState<any[]>([]);
  const [allTasks, setAllTasks]         = useState<any[]>([]);
  const [deptFilter, setDeptFilter]     = useState('');
  const [internProgress, setInternProg] = useState<any[]>([]);
  const [activities, setActivities]     = useState<any[]>([]);
  const [deadlines, setDeadlines]       = useState<any[]>([]);
  const [deptDist, setDeptDist]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      tasksApi.getDashboardStats(),
      tasksApi.getStatusDistribution(),
      tasksApi.getInternProgress(),
      tasksApi.getActivities(5),
      // NOT: Önceden sabit "5" limiti vardı — bu hafta bitecek 6+ görev
      // olduğunda bazıları sessizce listeden düşüyordu. Artık "bu hafta"
      // penceresi zaten backend'de 7 günle sınırlı olduğu için (bkz.
      // getUpcomingDeadlines), burada yüksek bir üst sınır (50) veriyoruz —
      // pratikte bir haftada bundan fazla görev bitmesi olası değil, ama
      // "sessizce kesme" riskini ortadan kaldırır.
      tasksApi.getUpcomingDeadlines(50),
      internsApi.getDeptDistribution(),
      internsApi.getStats(),
      tasksApi.getAll({ limit: 500 }),
    ]).then(([stats, dist, prog, acts, dead, dept, iStats, tasksRes]) => {
      setDashStats(stats.data);
      setStatusDist(dist.data);
      setInternProg(prog.data);
      setActivities(acts.data);
      setDeadlines(dead.data);
      setDeptDist(dept.data);
      setInternStats(iStats.data);
      setAllTasks(tasksRes.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // "Tümü ▾" önceden sadece süs bir <span>'dı — hiçbir işlevi yoktu. Artık
  // gerçek bir bölüm filtresi: seçilince donut, o bölümün görev dağılımını
  // istemci tarafında yeniden hesaplar.
  const departmentOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const t of allTasks) {
      const n = t.department?.name || t.intern?.department?.name;
      if (n) names.add(n);
    }
    return Array.from(names).sort();
  }, [allTasks]);

  const STATUS_DONUT_COLOR: Record<string, string> = {
    'Tamamlandı': '#22C55E', 'Devam Ediyor': '#F97316',
    'Beklemede': '#9333EA', 'Gecikmiş': '#EF4444', 'Planlandı': '#9CA3AF',
  };

  const filteredStatusDist = React.useMemo(() => {
    if (!deptFilter) return statusDist;
    const counts = new Map<string, number>();
    for (const t of allTasks) {
      const dept = t.department?.name || t.intern?.department?.name;
      if (dept !== deptFilter) continue;
      counts.set(t.status, (counts.get(t.status) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([status, count]) => ({
      status, count, color: STATUS_DONUT_COLOR[status] || '#9CA3AF',
    }));
  }, [deptFilter, statusDist, allTasks]);

  const STAT_CARDS = dashStats
    ? [
        { label: 'Toplam Stajyer',    value: internStats?.total ?? '-',          sub: 'Aktif stajyer sayısı',      icon: 'users',     color: 'blue' },
        { label: 'Aktif Görev',       value: dashStats.inProgress ?? '-',        sub: 'Devam eden görevler',       icon: 'clipboard', color: 'green',  trend: '+12%', trendType: 'up-green' as const },
        { label: 'Tamamlanan Görev',  value: dashStats.completed ?? '-',         sub: 'Tamamlanan görevler',       icon: 'check',     color: 'purple', trend: '+18%', trendType: 'up-green' as const },
        { label: 'Geciken Görev',     value: dashStats.delayed ?? '-',           sub: 'Süresi geçen görevler',     icon: 'clock',     color: 'red',    trend: '+25%', trendType: 'up-red' as const },
        { label: 'Ortalama İlerleme', value: `%${dashStats.averageProgress ?? 0}`, sub: 'Tüm stajyerler ortalaması', icon: 'chart', color: 'orange' },
        { label: 'Bu Hafta Teslim',   value: dashStats.dueSoon ?? '-',           sub: 'Bu hafta bitecek görev',    icon: 'calendar',  color: 'blue' },
      ]
    : [];

  const totalTasks = filteredStatusDist.reduce((s, d) => s + d.count, 0);
  const maxDept    = Math.max(...deptDist.map((d: any) => parseInt(d.count) || 0), 1);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Yükleniyor…</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Hoş geldiniz 👋"
        subtitle="Stajyerlerin durumu ve görevlerin genel özeti aşağıda yer almaktadır."
      />

      <div className="stats-row stats-row-6">
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Görev Durum Dağılımı</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                fontSize: 12, border: '1px solid var(--border)', borderRadius: 6,
                padding: '4px 8px', color: 'var(--text-secondary)', background: '#fff', cursor: 'pointer',
              }}
            >
              <option value="">Tümü</option>
              {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {filteredStatusDist.length > 0 ? (
            <DonutChart data={filteredStatusDist} total={totalTasks} centerLabel="Toplam Görev" />
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Veri yok</div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Bu Hafta Bitecek Görevler</span>
            <a className="card-link" href="/dashboard/is-takip">Tümünü Gör ›</a>
          </div>
          {deadlines.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Yaklaşan son tarih yok</div>
          ) : (
            <div style={{ maxHeight: deadlines.length > 5 ? 320 : undefined, overflowY: deadlines.length > 5 ? 'auto' : undefined }}>
              {deadlines.map((t: any, i) => (
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

        <div className="card">
          <div className="card-header">
            <span className="card-title">Stajyerlere Göre İlerleme</span>
            <a className="card-link" href="/dashboard/stajyerler">Tümünü Gör ›</a>
          </div>
          {internProgress.map((p: any, i) => (
            <div key={i} className="progress-row">
              <Avatar name={p.name} size="sm" />
              <span style={{ fontSize: 13, fontWeight: 500, minWidth: 100 }}>{p.name}</span>
              <ProgressBar
                value={Math.round(parseFloat(p.progress))}
                color={parseFloat(p.progress) >= 70 ? '#22C55E' : parseFloat(p.progress) >= 50 ? '#3B82F6' : '#F97316'}
              />
              <span className="progress-pct">{Math.round(parseFloat(p.progress))}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Görevlerde Son Aktiviteler</span>
            <a className="card-link" href="/dashboard/is-takip">Tümünü Gör ›</a>
          </div>
          {activities.map((a: any, i) => (
            <div key={i} className="activity-item">
              <div className={`activity-icon ${a.type}`}>
                {a.type === 'green' ? <Icon name="check" size={14} /> : a.type === 'red' ? <Icon name="alertCircle" size={14} /> : <Icon name="clock" size={14} />}
              </div>
              <div>
                <div className="activity-text" dangerouslySetInnerHTML={{ __html: a.message }} />
                <div className="activity-time">{a.internName} · {timeAgo(a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Bölümlere Göre Stajyer Dağılımı</span>
          </div>
          {deptDist.map((d: any, i) => (
            <div key={i} className="h-bar-item">
              <div className="h-bar-label"><span>{d.name}</span><span>{d.count}</span></div>
              <div className="h-bar-track">
                <div className="h-bar-fill" style={{ width: `${(parseInt(d.count) / maxDept) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Yaklaşan Önemli Tarihler</span></div>
          {deadlines.map((d: any, i) => (
            <div key={i} className="date-item">
              <span className="date-badge">{formatDate(d.dueDate)}</span>
              <span className="date-text">{d.title} teslim tarihi</span>
            </div>
          ))}
        </div>
      </div>

      <InfoBanner text="Genel bakış verileri tüm stajyerlerin son durumunu yansıtmaktadır. Daha detaylı analizler için raporlar sayfasını ziyaret edebilirsiniz." />
    </>
  );
}
