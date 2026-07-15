'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import api from '@/lib/api';

// Yönetici'nin stajyerler hakkında gördüğü TEK sayfa — ve TEK bilgi:
// "Ana Görev". Günlük görev/bildirim trafiği (İş Takip Listesi, Haftalık
// Plan, Belgeler vb.) BİLİNÇLİ olarak bu panelde YOK — o, Personel'in işi.
export default function StajyerlerOzetPage() {
  const [interns, setInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/interns', { params: { limit: 500 } })
      .then((r) => setInterns(r.data?.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = interns.filter((i) =>
    !search || i.user?.name?.toLowerCase().includes(search.toLowerCase()) || i.mentor?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Stajyerler"
        subtitle='Yalnızca "Ana Görev" bilgisi gösterilir. Günlük görev ve bildirim takibi Personel tarafından yapılır.'
      />

      <div className="search-input" style={{ maxWidth: 320, marginBottom: 16 }}>
        <Icon name="search" size={16} />
        <input placeholder="Stajyer ya da mentör ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>Stajyer</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>Mentör (Personel)</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>Ana Görev</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{i.user?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{i.department?.name || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{i.mentor?.name || <span style={{ color: '#CBD5E1' }}>Atanmamış</span>}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {i.mainTask ? i.mainTask : <span style={{ color: '#CBD5E1' }}>Girilmemiş</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Stajyer bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
