'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { announcementsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DuyurularPage() {
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ title: '', content: '' });
  const [saving, setSaving]     = useState(false);

  const load = () => {
    announcementsApi.getAll()
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast.error('Başlık ve içerik zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await announcementsApi.create(form);
      toast.success('Duyuru oluşturuldu.');
      setModal(false);
      setForm({ title: '', content: '' });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementsApi.remove(id);
      toast.success('Duyuru silindi.');
      load();
    } catch {
      toast.error('Silme başarısız.');
    }
  };

  return (
    <>
      <PageHeader
        title="Duyurular"
        subtitle="Stajyerlere yönelik duyuruları yönetin ve paylaşın."
        btnText="Yeni Duyuru"
        onBtnClick={() => setModal(true)}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          Yükleniyor…
        </div>
      ) : items.length === 0 ? (
        <div className="placeholder-page">
          <div style={{ width: 72, height: 72, background: 'var(--primary-light)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: 16 }}>
            <Icon name="bell" size={32} />
          </div>
          <h2>Henüz duyuru yok</h2>
          <p style={{ marginTop: 8 }}>Yeni duyuru oluşturmak için butona tıklayın.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((a: any) => (
            <div key={a.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.content}</div>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {a.createdBy?.name} · {formatDate(a.createdAt)}
                  </div>
                </div>
                <button className="action-btn delete" onClick={() => handleDelete(a.id)} title="Sil">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Yeni Duyuru</span>
              <button className="action-btn" onClick={() => setModal(false)}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Başlık</label>
                <input
                  className="form-input"
                  placeholder="Duyuru başlığı"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">İçerik</label>
                <textarea
                  className="form-textarea"
                  placeholder="Duyuru içeriği..."
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setModal(false)}>İptal</Button>
              <Button loading={saving} onClick={handleCreate}>Yayınla</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
