'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import InfoBanner from '@/components/layout/InfoBanner';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
function getAvatarColor(name: string) {
  const colors = ['#3B82F6','#8B5CF6','#EC4899','#F97316','#10B981','#06B6D4','#EF4444','#F59E0B'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function InitialAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

export default function AyarlarPage() {
  const { user, setAuth, token } = useAuthStore();

  // ── Profil ──────────────────────────────────────────────────────────────────
  const [profile, setProfile]     = useState({ name: user?.name || '', email: user?.email || '' });
  const [profLoading, setProfLoad] = useState(false);

  useEffect(() => {
    setProfile({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  const handleProfileSave = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      toast.error('Ad ve e-posta zorunludur.');
      return;
    }
    setProfLoad(true);
    try {
      // Her zaman API'ye gönder — catch bloğu artık hata gizlemez
      await api.patch(`/users/${user?.id}`, {
        name:  profile.name.trim(),
        email: profile.email.trim(),
      });
      // Store'u da güncelle (sidebar anında yansısın)
      setAuth({ ...user!, name: profile.name.trim(), email: profile.email.trim() }, token || '');
      toast.success('Profil güncellendi ve veritabanına kaydedildi.');
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Profil güncellenemedi.');
    } finally {
      setProfLoad(false);
    }
  };

  // ── Şifre Değiştir ──────────────────────────────────────────────────────────
  const [pwd, setPwd]           = useState({ current: '', next: '', confirm: '' });
  const [pwdLoading, setPwdLoad] = useState(false);

  const handlePwdSave = async () => {
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      toast.error('Tüm şifre alanları zorunludur.');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error('Yeni şifreler eşleşmiyor.');
      return;
    }
    if (pwd.next.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    setPwdLoad(true);
    try {
      await api.patch(`/users/${user?.id}/password`, {
        currentPassword: pwd.current,
        newPassword:     pwd.next,
      });
      toast.success('Şifre veritabanına kaydedildi. Bir sonraki girişte yeni şifreniz geçerli.');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Şifre güncellenemedi. Mevcut şifrenizi kontrol edin.');
    } finally {
      setPwdLoad(false);
    }
  };


  // ── Yönetici listesi ────────────────────────────────────────────────────────
  const [managers,  setManagers]  = useState<any[]>([]);
  const [mgrLoad,   setMgrLoad]   = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [confirmDel,setConfirmDel]= useState<string | null>(null);
  const [newMgr, setNewMgr]       = useState({ name: '', email: '', password: '' });
  const [addLoad, setAddLoad]     = useState(false);

  const loadManagers = async () => {
    setMgrLoad(true);
    try {
      const res = await usersApi.getAll();
      const all: any[] = res.data || [];
      setManagers(all.filter((u) => u.role === 'manager' || u.role === 'admin'));
    } catch {
      setManagers([{ id: user?.id || 'mock', name: user?.name || 'Emre Bozar', email: user?.email || 'admin@stajyer.com', role: 'admin' }]);
    } finally {
      setMgrLoad(false);
    }
  };

  useEffect(() => { loadManagers(); }, []);

  const handleAddManager = async () => {
    if (!newMgr.name.trim() || !newMgr.email.trim() || !newMgr.password.trim()) {
      toast.error('Ad, e-posta ve şifre zorunludur.');
      return;
    }
    setAddLoad(true);
    try {
      await api.post('/users', { name: newMgr.name, email: newMgr.email, password: newMgr.password, role: 'manager' });
      toast.success(`${newMgr.name} yönetici olarak eklendi.`);
      setNewMgr({ name: '', email: '', password: '' });
      await loadManagers();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Eklenemedi.');
    } finally {
      setAddLoad(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/users/${id}`);
      toast.success('Yönetici silindi.');
      setConfirmDel(null);
      await loadManagers();
    } catch {
      toast.error('Silinemedi.');
    } finally {
      setDeleting(null);
    }
  };

  // Rol değiştirme (Admin ⇄ Yönetici) — backend tarafında da bu işlem
  // SADECE admin'e izinli (bkz. users.controller.ts) — bir manager bu
  // butona bassa bile backend reddeder, sadece admin girişinde anlamlı.
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const handleRoleChange = async (m: any, newRole: 'admin' | 'manager') => {
    setRoleChanging(m.id);
    try {
      await api.patch(`/users/${m.id}`, { role: newRole });
      toast.success(`${m.name} artık ${newRole === 'admin' ? 'Admin' : 'Yönetici'}.`);
      await loadManagers();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Rol değiştirilemedi.');
    } finally {
      setRoleChanging(null);
    }
  };

  const isSelf = (id: string) => id === user?.id;

  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Hesap bilgilerinizi ve sistem yöneticilerini yönetin." />

      {/* Üst satır: Profil + Şifre Değiştir */}
      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* Profil */}
        <div className="card">
          <div className="card-header"><span className="card-title">Profil Bilgileri</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <InitialAvatar name={profile.name || 'K'} size={52} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{profile.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{profile.email}</div>
              <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>
                {user?.role === 'admin' ? 'Admin' : 'Yönetici'}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ad Soyad</label>
            <input className="form-input" value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <input className="form-input" type="text" inputMode="email" value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <Button loading={profLoading} onClick={handleProfileSave} style={{ marginTop: 4 }}>
            Değişiklikleri Kaydet
          </Button>
        </div>

        {/* Şifre Değiştir */}
        <div className="card">
          <div className="card-header"><span className="card-title">Şifre Değiştir</span></div>
          <div className="form-group">
            <label className="form-label">Mevcut Şifre</label>
            <input className="form-input" type="password" value={pwd.current}
              onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Yeni Şifre</label>
            <input className="form-input" type="password" value={pwd.next}
              onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Yeni Şifre (Tekrar)</label>
            <input className="form-input" type="password" value={pwd.confirm}
              onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
          </div>
          <Button loading={pwdLoading} onClick={handlePwdSave} style={{ marginTop: 4 }}>
            Şifreyi Güncelle
          </Button>
        </div>
      </div>

      {/* Yönetici tablosu */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Sistem Yöneticileri</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{managers.length} yönetici</span>
        </div>

        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr><th>Yönetici</th><th>E-posta</th><th>Rol</th><th>İşlemler</th></tr>
            </thead>
            <tbody>
              {mgrLoad ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
              ) : managers.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InitialAvatar name={m.name} size={32} />
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      {isSelf(m.id) && (
                        <span style={{ fontSize: 10, background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>Siz</span>
                      )}
                    </div>
                  </td>
                  <td>{m.email}</td>
                  <td><span style={{ fontWeight: 600, color: m.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: 12 }}>{m.role === 'admin' ? 'Admin' : 'Yönetici'}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Rol değiştirme — sadece giriş yapan admin ise görünür.
                          Backend de bunu ayrıca zorunlu kılıyor. */}
                      {user?.role === 'admin' && (
                        m.role === 'admin' ? (
                          <button
                            onClick={() => handleRoleChange(m, 'manager')}
                            disabled={roleChanging === m.id}
                            title="Yönetici yap (admin yetkisini kaldır)"
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                              border: '1px solid var(--border)', background: '#fff',
                              color: 'var(--text-secondary)', cursor: 'pointer',
                            }}>
                            {roleChanging === m.id ? '…' : 'Yönetici Yap'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(m, 'admin')}
                            disabled={roleChanging === m.id}
                            title="Admin yap (tüm yetkileri verir)"
                            style={{
                              fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
                              border: '1px solid var(--primary)', background: '#EFF6FF',
                              color: 'var(--primary)', cursor: 'pointer',
                            }}>
                            {roleChanging === m.id ? '…' : 'Admin Yap'}
                          </button>
                        )
                      )}
                      {isSelf(m.id) ? (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Silinemez</span>
                      ) : confirmDel === m.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-danger" onClick={() => handleDelete(m.id)} disabled={!!deleting}
                            style={{ fontSize: 12, padding: '4px 10px' }}>
                            {deleting === m.id ? '…' : 'Evet, Sil'}
                          </button>
                          <button className="btn-secondary" onClick={() => setConfirmDel(null)}
                            style={{ fontSize: 12, padding: '4px 10px' }}>İptal</button>
                        </div>
                      ) : (
                        <button className="action-btn delete" onClick={() => setConfirmDel(m.id)} title="Sil">
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Yeni yönetici */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Yeni Yönetici Ekle</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ad Soyad *</label>
              <input className="form-input" value={newMgr.name}
                onChange={(e) => setNewMgr((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta *</label>
              <input className="form-input" type="text" inputMode="email" value={newMgr.email}
                onChange={(e) => setNewMgr((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Şifre *</label>
              <input className="form-input" type="password" value={newMgr.password}
                onChange={(e) => setNewMgr((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          <Button loading={addLoad} onClick={handleAddManager}>
            <Icon name="plus" size={16} /> Yönetici Ekle
          </Button>
        </div>
      </div>

      <InfoBanner text="Profil değişiklikleri kaydedildiğinde sol menüdeki baş harf avatarı ve isim anında güncellenir. Yeni yöneticiler kendi e-posta ve şifreleriyle sisteme giriş yapabilir." />
    </>
  );
}