'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import InfoBanner from '@/components/layout/InfoBanner';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import StatCard from '@/components/ui/StatCard';
import { attendanceApi } from '@/lib/api';
import { exportToExcel } from '@/lib/export';
import toast from 'react-hot-toast';

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  office: { text: '🟢 Ofiste',        color: '#16A34A', bg: '#F0FDF4' },
  left:   { text: '🔵 Çıkış Yaptı',   color: '#2563EB', bg: '#EFF6FF' },
  absent: { text: '⚪ Giriş Yapmadı', color: '#6B7280', bg: '#F9FAFB' },
};

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(min: number | null) {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
}

export default function DevamTakibiPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isToday = date === new Date().toISOString().split('T')[0];

  const load = () => {
    setLoading(true);
    attendanceApi.overview(date)
      .then(r => setRows(r.data?.rows || []))
      .catch(() => toast.error('Devam verileri yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const filtered = rows.filter((r: any) =>
    !search || r.internName?.toLowerCase().includes(search.toLowerCase()),
  );

  const officeCount = rows.filter((r: any) => r.status === 'office').length;
  const leftCount = rows.filter((r: any) => r.status === 'left').length;
  const absentCount = rows.filter((r: any) => r.status === 'absent').length;

  const handleExport = () => {
    if (!filtered.length) { toast('Aktarılacak veri yok.', { icon: 'ℹ️' }); return; }
    exportToExcel(
      filtered.map((r: any) => ({
        'Stajyer': r.internName,
        'Bölüm': r.department,
        'Durum': STATUS_LABEL[r.status]?.text.replace(/[🟢🔵⚪]\s*/, '') || r.status,
        'Giriş': fmtTime(r.checkIn),
        'Çıkış': fmtTime(r.checkOut),
        'Süre': fmtDuration(r.duration),
      })),
      `devam-takibi_${date}`,
      'Devam',
    );
  };

  return (
    <>
      <PageHeader
        title="Devam Takibi"
        subtitle="Aktif stajyerlerin günlük giriş/çıkış durumunu tek ekrandan görün."
      />

      <div className="stats-row stats-row-4">
        <StatCard label="Toplam Aktif Stajyer" value={rows.length} icon="users" color="blue" sub="Kayıtlı" />
        <StatCard label="Ofiste" value={officeCount} icon="check" color="green" sub="Şu an mesaide" />
        <StatCard label="Çıkış Yaptı" value={leftCount} icon="clock" color="orange" sub="Bugün tamamladı" />
        <StatCard label="Giriş Yapmadı" value={absentCount} icon="x" color="red" sub="Henüz gelmedi" />
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ maxWidth: 280 }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Stajyer ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={16} />
          <input
            type="date"
            value={date}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
          />
          {!isToday && (
            <button className="btn-secondary" onClick={() => setDate(new Date().toISOString().split('T')[0])}>
              Bugün
            </button>
          )}
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stajyer</th>
                <th>Bölüm</th>
                <th>Durum</th>
                <th>Giriş</th>
                <th>Çıkış</th>
                <th>Süre</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  {search ? 'Arama sonucu bulunamadı.' : 'Aktif stajyer bulunamadı.'}
                </td></tr>
              ) : (
                filtered.map((r: any) => {
                  const s = STATUS_LABEL[r.status] || STATUS_LABEL.absent;
                  return (
                    <tr key={r.internId}>
                      <td>
                        <div className="intern-cell">
                          <Avatar name={r.internName} size="sm" />
                          <span style={{ fontWeight: 500 }}>{r.internName}</span>
                        </div>
                      </td>
                      <td>{r.department}</td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          color: s.color, background: s.bg,
                        }}>
                          {s.text}
                        </span>
                      </td>
                      <td>{fmtTime(r.checkIn)}</td>
                      <td>{fmtTime(r.checkOut)}</td>
                      <td>{fmtDuration(r.duration)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>{filtered.length} stajyer listeleniyor</span>
        </div>
      </div>

      <InfoBanner text="Bu sayfa sadece Pasif/Ayrılan değil, Aktif durumdaki stajyerleri gösterir. Tarihi geçmişe alarak seçtiğiniz günün devam durumunu görebilirsiniz." />
    </>
  );
}
