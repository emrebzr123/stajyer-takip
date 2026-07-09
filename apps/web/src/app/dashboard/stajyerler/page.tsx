'use client';
import React, { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Pagination from '@/components/layout/Pagination';
import StatCard from '@/components/ui/StatCard';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import InternModal from '@/components/modals/InternModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import InternDrawer from '@/components/modals/InternDrawer';
import MessagePreviewModal from '@/components/modals/MessagePreviewModal';
import { useInterns } from '@/hooks/useInterns';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import toast from 'react-hot-toast';

export default function StajyerlerPage() {
  const {
    data, stats, loading, error,
    page, setPage, total, totalPages,
    search, setSearch,
    statusFilter, setStatus,
    remove, refresh,
  } = useInterns();

  const [modal,   setModal]   = useState<{ open: boolean; intern?: any }>({ open: false });
  const [confirm, setConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [drawer,  setDrawer]  = useState<any | null>(null);
  const [msgModal, setMsgModal] = useState<{ open: boolean; konu: string; mesaj: string; title: string }>({ open: false, konu: '', mesaj: '', title: '' });

  // Ekranda görünen (filtrelenmiş) stajyerleri Excel dosyası olarak indirir.
  const handleExport = () => {
    if (!data.length) { toast('Aktarılacak stajyer yok.', { icon: 'ℹ️' }); return; }
    exportToExcel(
      data.map((i: any) => ({
        'Ad Soyad': i.user?.name || '-',
        'E-posta': i.user?.email || '-',
        'Firma': i.company?.name || '-',
        'Bölüm': i.department?.name || i.academicDepartment || '-',
        'Üniversite': i.university || '-',
        'Dönem': i.term || '-',
        'Durum': i.status,
        'Çalışma': i.workType || '-',
        'Mentör': i.mentor?.name || '-',
        'Başlangıç': i.startDate || '-',
        'Bitiş': i.endDate || '-',
      })),
      'stajyer-listesi',
      'Stajyerler',
    );
  };
  const [deleting, setDeleting] = useState(false);

  const STAT_CARDS = stats ? [
    { label: 'Toplam Stajyer',     value: stats.total,     sub: 'Tüm stajyerler',        icon: 'users',      color: 'blue' },
    { label: 'Aktif Stajyer',      value: stats.active,    sub: 'Tüm aktif stajyerler',  icon: 'clipboard',  color: 'green' },
    { label: 'Mezun / Tamamlayan', value: stats.graduated, sub: 'Programı tamamlayanlar', icon: 'graduation', color: 'purple' },
    { label: 'Pasif Stajyer',      value: stats.passive,   sub: 'Pasif durumda olanlar', icon: 'pause',      color: 'orange' },
    { label: 'Ayrılan Stajyer',    value: stats.left,      sub: 'Programdan ayrılanlar', icon: 'x',          color: 'red' },
  ] : [];

  const handleSuccess = () => {
    setModal({ open: false });
    setTimeout(() => refresh(), 300);
  };

  const handleDelete = async () => {
    if (!confirm.id) return;
    setDeleting(true);
    try {
      await remove(confirm.id);
      toast.success('Stajyer silindi.');
      setConfirm({ open: false });
    } catch {
      toast.error('Silme işlemi başarısız.');
    } finally { setDeleting(false); }
  };

  return (
    <>
      <PageHeader
        title="Stajyerler"
        subtitle="Stajyerleri listeleyin, ekleyin ve bilgilerini yönetin."
        btnText="Yeni Stajyer Ekle"
        onBtnClick={() => setModal({ open: true, intern: undefined })}
      />

      <div className="stats-row stats-row-5">
        {STAT_CARDS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="filter-bar">
        <div className="search-input" style={{ flex: 1 }}>
          <Icon name="search" size={16} />
          <input
            type="text" placeholder="Stajyer, firma, üniversite ara..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="">Durum: Tümü</option>
          {['Aktif','Mezun','Pasif','Ayrıldı'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="filter-actions">
          <button className="btn-secondary" onClick={handleExport}><Icon name="download" size={16} /> Dışa Aktar</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stajyer</th>
                <th>Firma</th>
                <th>Üniversite</th>
                <th>Bölüm</th>
                <th>Dönem</th>
                <th>Durum</th>
                <th>Çalışma</th>
                <th>Mentör</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
              ) : error ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>{error}</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Stajyer bulunamadı.</td></tr>
              ) : data.map((intern: any) => (
                <tr
                  key={intern.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDrawer(intern)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <div className="intern-cell">
                      <Avatar name={intern.user?.name || '-'} />
                      <div className="intern-info">
                        <div className="name">{intern.user?.name}</div>
                        <div className="email">{intern.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {intern.company?.name
                      ? <span style={{ fontWeight: 500, color: 'var(--primary)' }}>🏢 {intern.company.name}</span>
                      : <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {intern.university || '—'}
                  </td>
                  <td style={{ fontSize: 12 }}>{intern.academicDepartment || intern.department?.name || '—'}</td>
                  <td>{intern.term || '—'}</td>
                  <td><Badge text={intern.status} /></td>
                  <td>
                    {intern.workType ? (
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        background: intern.workType === 'Hibrit' ? '#F0FDF4' : intern.workType === 'Uzaktan' ? '#EFF6FF' : '#F9FAFB',
                        color: intern.workType === 'Hibrit' ? '#16A34A' : intern.workType === 'Uzaktan' ? '#2563EB' : 'var(--text-secondary)',
                      }}>
                        {intern.workType}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{intern.mentor?.name || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="action-btns">
                      <button className="action-btn edit" title="Düzenle"
                        onClick={() => setModal({ open: true, intern })}>
                        <Icon name="edit" size={14} />
                      </button>
                      
                      <button className="action-btn delete" title="Sil"
                        onClick={() => setConfirm({ open: true, id: intern.id })}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={total} label="stajyer" page={page} totalPages={totalPages} limit={10} onPageChange={setPage} />
      </div>

      <InternModal
        open={modal.open} intern={modal.intern}
        onClose={() => setModal({ open: false })}
        onSuccess={handleSuccess}
      />
      <ConfirmModal
        open={confirm.open}
        message="Bu stajyeri silmek istediğinize emin misiniz?"
        onConfirm={handleDelete}
        onClose={() => setConfirm({ open: false })}
        loading={deleting}
      />
      {drawer && <InternDrawer intern={drawer} onClose={() => setDrawer(null)} />}
      <MessagePreviewModal open={msgModal.open} konu={msgModal.konu} mesaj={msgModal.mesaj} title={msgModal.title} onClose={() => setMsgModal(p => ({...p, open: false}))} />
    </>
  );
}
