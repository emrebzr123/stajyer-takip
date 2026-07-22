'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import api, { personnelTasksApi } from '@/lib/api';
import toast from 'react-hot-toast';

// NOT: Bu sayfa önceden hem personel yönetimini HEM proje/görev atamayı
// tek ekranda yapıyordu — kalabalık ve karışıktı. Artık SADECE personel
// yönetimi (ekle/sil/Yönetici-Personel rol değişimi) burada; proje/görev
// atama "Görevler" sayfasına taşındı (bkz. /yonetici/dashboard/gorevler).
export default function PersonelPage() {
  const [personel, setPersonel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingPersonel, setAddingPersonel] = useState(false);
  const [newP, setNewP] = useState({ name: '', email: '', password: '' });
  const [savingP, setSavingP] = useState(false);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  // Silme onayı gösterilirken, bu personelin kaç projesi/görevi olduğunu
  // (o kişi silinince CASCADE ile hepsinin de gideceğini) gösterip
  // yanlışlıkla veri kaybını önlemek için.
  const [deleteBoardCount, setDeleteBoardCount] = useState<number | null>(null);
  const [checkingDeleteImpact, setCheckingDeleteImpact] = useState(false);

  // Düzenleme — isim/e-posta yanlış girildiyse düzeltmek için. Backend'deki
  // PATCH /users/:id zaten bu alanları destekliyor, sadece arayüz eksikti.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadPersonel = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users');
      setPersonel((r.data || []).filter((u: any) => u.role === 'manager' || u.role === 'admin'));
    } catch {
      toast.error('Personel listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPersonel(); }, []);

  const handleAddPersonel = async () => {
    if (!newP.name.trim() || !newP.email.trim() || !newP.password.trim()) {
      toast.error('Ad, e-posta ve şifre zorunludur.');
      return;
    }
    setSavingP(true);
    try {
      await api.post('/users', { name: newP.name.trim(), email: newP.email.trim(), password: newP.password, role: 'manager' });
      toast.success('Personel eklendi.');
      setNewP({ name: '', email: '', password: '' });
      setAddingPersonel(false);
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Personel eklenemedi.');
    } finally {
      setSavingP(false);
    }
  };

  const handleRoleChange = async (p: any, newRole: 'admin' | 'manager') => {
    setRoleChanging(p.id);
    try {
      await api.patch(`/users/${p.id}`, { role: newRole });
      toast.success(`${p.name} artık ${newRole === 'admin' ? 'Admin/Yönetici' : 'Personel'}.`);
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Rol değiştirilemedi.');
    } finally {
      setRoleChanging(null);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    // Şifre alanı hep boş başlar — mevcut şifreyi zaten göremeyiz
    // (backend'de hashli), boş bırakılırsa değişmez.
    setEditForm({ name: p.name, email: p.email, password: '' });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Ad ve e-posta boş bırakılamaz.');
      return;
    }
    if (editForm.password && editForm.password.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    setSavingEdit(true);
    try {
      const payload: any = { name: editForm.name.trim(), email: editForm.email.trim() };
      // Şifre alanı boş bırakıldıysa payload'a hiç eklemiyoruz — backend
      // 'newPassword' alanı gelmezse şifreye dokunmuyor zaten, ama yine de
      // boş string göndermemek daha temiz.
      if (editForm.password.trim()) payload.newPassword = editForm.password.trim();

      await api.patch(`/users/${id}`, payload);
      toast.success('Personel bilgileri güncellendi.');
      setEditingId(null);
      // Backend'deki gerçek veriyle senkron kalmak için listeyi yeniden
      // çekiyoruz — sadece yerel state'i güncellemek yeterli olmazdı,
      // örn. sayfa yenilendiğinde eski veri görünürdü.
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Güncellenemedi — bu e-posta başka bir hesapta kayıtlı olabilir.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePersonel = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('Personel silindi.');
      setConfirmDel(null);
      setDeleteBoardCount(null);
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Silinemedi.');
    }
  };

  // "Sil" tıklanınca, onay kutusunu göstermeden ÖNCE o personelin kaç
  // projesi/görevi olduğunu çekiyoruz — bir Personel silindiğinde ona ait
  // TÜM projeler/görevler de (veritabanı seviyesinde CASCADE ile) otomatik
  // siliniyor, kullanıcı bunu bilmeden onaylamasın diye.
  const handleDeleteClick = async (id: string) => {
    setConfirmDel(id);
    setDeleteBoardCount(null);
    setCheckingDeleteImpact(true);
    try {
      // NOT: getBoardsFor() yerine BİLEREK bu ayrı uç kullanılıyor —
      // getBoardsFor() bu Yönetici'nin GÖRÜNÜRLÜK kısıtlamasına göre
      // filtrelenmiş sonuç döner (başka bir Yönetici'nin bu isteği yapan
      // kişiden gizlediği bir proje varsa sayılmaz), ama silme geri
      // alınamaz olduğu için burada GERÇEK (tam) sayı gösterilmeli.
      const r = await personnelTasksApi.countBoardsForDeletionWarning(id);
      setDeleteBoardCount(r.data?.count ?? null);
    } catch {
      setDeleteBoardCount(null);
    } finally {
      setCheckingDeleteImpact(false);
    }
  };

  return (
    <div>
      <PageHeader title="Personel" subtitle="Personel ekleyin, silin ya da Yönetici/Personel rolünü değiştirin." />

      <div style={{ marginBottom: 16 }}>
        {addingPersonel ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 640 }}>
            <input placeholder="Ad Soyad" value={newP.name} onChange={(e) => setNewP((f) => ({ ...f, name: e.target.value }))}
              style={{ flex: 1, minWidth: 140, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <input placeholder="E-posta" value={newP.email} onChange={(e) => setNewP((f) => ({ ...f, email: e.target.value }))}
              style={{ flex: 1, minWidth: 160, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <input placeholder="Şifre" type="text" value={newP.password} onChange={(e) => setNewP((f) => ({ ...f, password: e.target.value }))}
              style={{ flex: 1, minWidth: 120, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <button onClick={handleAddPersonel} disabled={savingP}
              style={{ border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {savingP ? '…' : 'Ekle'}
            </button>
            <button onClick={() => setAddingPersonel(false)} style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>Vazgeç</button>
          </div>
        ) : (
          <button onClick={() => setAddingPersonel(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Icon name="plus" size={15} /> Personel Ekle
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Kayıt sayısı arttıkça tüm sayfayı uzatmak yerine, liste kendi
              içinde kayıyor — başlık dahil (400px'den sonra). */}
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>Personel</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}></th>
              </tr>
            </thead>
            <tbody>
              {personel.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    {editingId === p.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 280 }}>
                        <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Ad Soyad"
                          style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 13 }} />
                        <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="E-posta"
                          style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
                        <input value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="Yeni şifre (opsiyonel — boş bırakılırsa değişmez)"
                          type="text"
                          style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.email}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, marginTop: 3, display: 'inline-block',
                          color: p.role === 'admin' ? '#1E3A5F' : '#0F6E6E',
                          background: p.role === 'admin' ? '#1E3A5F14' : '#0F6E6E14',
                        }}>
                          {p.role === 'admin' ? 'Yönetici' : 'Personel'}
                        </span>
                      </>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {editingId === p.id ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => handleSaveEdit(p.id)} disabled={savingEdit}
                          style={{ fontSize: 10, fontWeight: 700, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>
                          {savingEdit ? '…' : 'Kaydet'}
                        </button>
                        <button onClick={() => setEditingId(null)} disabled={savingEdit}
                          style={{ fontSize: 10, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>
                          Vazgeç
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: confirmDel === p.id ? 'column' : 'row', alignItems: confirmDel === p.id ? 'flex-end' : 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {confirmDel === p.id && (
                          <div style={{ fontSize: 10, color: '#B91C1C', textAlign: 'right', maxWidth: 180 }}>
                            {checkingDeleteImpact ? (
                              'Kontrol ediliyor…'
                            ) : deleteBoardCount && deleteBoardCount > 0 ? (
                              <>⚠️ Bu personelin {deleteBoardCount} proje/görevi de silinecek!</>
                            ) : (
                              'Personel silinecek.'
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleRoleChange(p, p.role === 'admin' ? 'manager' : 'admin')} disabled={roleChanging === p.id}
                          title={p.role === 'admin' ? 'Personel yap' : 'Yönetici yap'}
                          style={{ fontSize: 10, fontWeight: 600, padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', display: confirmDel === p.id ? 'none' : undefined }}>
                          {roleChanging === p.id ? '…' : p.role === 'admin' ? 'Personel Yap' : 'Yönetici Yap'}
                        </button>
                        <button onClick={() => startEdit(p)} title="Düzenle"
                          style={{ border: 'none', background: 'none', color: '#64748B', cursor: 'pointer', padding: 4, display: confirmDel === p.id ? 'none' : undefined }}>
                          <Icon name="edit" size={13} />
                        </button>
                        {confirmDel === p.id ? (
                          <>
                            <button onClick={() => handleDeletePersonel(p.id)} style={{ fontSize: 10, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 6, padding: '4px 7px', cursor: 'pointer' }}>Evet</button>
                            <button onClick={() => { setConfirmDel(null); setDeleteBoardCount(null); }} style={{ fontSize: 10, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '4px 7px', cursor: 'pointer' }}>Vazgeç</button>
                          </>
                        ) : (
                          <button onClick={() => handleDeleteClick(p.id)} title="Sil" style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}>
                            <Icon name="trash" size={13} />
                          </button>
                        )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {personel.length === 0 && (
                <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Henüz personel yok.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
