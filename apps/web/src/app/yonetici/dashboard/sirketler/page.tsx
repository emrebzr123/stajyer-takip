'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import { companiesApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Şirket (Company) yönetimi — backend zaten hazırdı (stajyer ekleme
// formundaki "Firma" alanı için kullanılıyordu), ama Yönetici panelinde
// bunu doğrudan ekleyip/silebileceğin bir ekran hiç yoktu. Artık burada.
// Buradan eklenen/silinen şirketler, hem stajyer formundaki "Firma"
// listesinde HEM DE "Proje Ekle" formundaki şirket seçiminde aynı anda
// görünür — ikisi de aynı tabloyu kullanıyor.
export default function SirketlerPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = () => {
    companiesApi.getAll()
      .then((r) => setCompanies(r.data || []))
      .catch(() => toast.error('Şirketler yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await companiesApi.findOrCreate(newName.trim());
      toast.success('Şirket eklendi.');
      setNewName('');
      load();
    } catch {
      toast.error('Şirket eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await companiesApi.remove(id);
      toast.success('Şirket silindi.');
      setConfirmDel(null);
      load();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Şirketler"
        subtitle='Buraya eklenen şirketler hem "Proje Ekle" formunda hem stajyer ekleme formundaki "Firma" alanında görünür.'
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 420 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Şirket adı…"
          maxLength={60}
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}
        />
        <button onClick={handleAdd} disabled={saving || !newName.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, border: 'none',
            background: '#1E3A5F', color: '#fff', borderRadius: 8,
            padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
          <Icon name="plus" size={15} /> {saving ? '…' : 'Ekle'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : companies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Henüz şirket yok</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Yukarıdan ilk şirketi ekleyin.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', maxWidth: 500 }}>
          {companies.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, background: '#1E3A5F14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
                }}>
                  🏢
                </span>
                <span title={c.name} style={{
                  fontWeight: 600, fontSize: 14, minWidth: 0, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.name}
                </span>
              </div>
              {confirmDel === c.id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleDelete(c.id)}
                    style={{ border: 'none', background: '#EF4444', color: '#fff', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Evet, Sil
                  </button>
                  <button onClick={() => setConfirmDel(null)}
                    style={{ border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>
                    Vazgeç
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(c.id)} title="Sil"
                  style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}>
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 14, maxWidth: 500 }}>
        Bir şirketi silersen, ona bağlı projeler ya da stajyerler silinmez — sadece "şirketsiz" duruma düşer.
      </p>
    </div>
  );
}
