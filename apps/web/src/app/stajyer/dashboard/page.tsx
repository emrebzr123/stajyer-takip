'use client';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Devam (check-in) kartı — backend'de hazır olup hiç kullanılmayan
// attendance modülünü kullanıma açar. Stajyer ofis günlerinde giriş/çıkış
// işaretler; yönetici, stajyer detay ekranından son kayıtları görür.
function AttendanceCard() {
  const [today, setToday] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/attendance/today').then(r => setToday(r.data)).catch(() => undefined);
  useEffect(() => { load(); }, []);

  const act = async (type: 'check-in' | 'check-out') => {
    setBusy(true);
    try {
      await api.post(`/attendance/${type}`);
      toast.success(type === 'check-in' ? '✅ Giriş kaydedildi. İyi çalışmalar!' : '👋 Çıkış kaydedildi. İyi günler!');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'İşlem başarısız.');
    } finally { setBusy(false); }
  };

  const record = today?.record;
  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 26 }}>🕐</span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Bugünkü Devam Durumun</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {record?.checkIn
            ? <>Giriş: <strong>{new Date(record.checkIn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong>
              {record.checkOut && <> · Çıkış: <strong>{new Date(record.checkOut).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</strong></>}</>
            : 'Henüz giriş yapmadın.'}
        </div>
      </div>
      {!record?.checkIn ? (
        <button onClick={() => act('check-in')} disabled={busy}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {busy ? '…' : '▶️ Giriş Yap'}
        </button>
      ) : !record?.checkOut ? (
        <button onClick={() => act('check-out')} disabled={busy}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#F97316', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {busy ? '…' : '⏹ Çıkış Yap'}
        </button>
      ) : (
        <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>✅ Bugün tamamlandı</span>
      )}
    </div>
  );
}

export default function StajyerAnaSayfa() {
  const { user } = useAuthStore();
  const [tasks, setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/my?limit=100').then((r) => setTasks(r.data.data || [])).finally(() => setLoading(false));
  }, [user]);

  const completed = tasks.filter(t => t.status === 'Tamamlandı').length;
  const progress  = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
          Hoş geldin, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* İstek üzerine Ana Sayfa'da yalnızca "Genel Staj İlerlemem" kalır.
          "Staj Bilgilerim" kartı (mentör, firma, ofis günleri vb.)
          Profilim sekmesine taşındı. */}
      <AttendanceCard />
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>📊 Genel Staj İlerlemem</div>
        {loading ? <div style={{ color: 'var(--text-secondary)' }}>Yükleniyor…</div> : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 8, height: 16, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: progress >= 70 ? '#22C55E' : '#F97316',
                  borderRadius: 8, transition: 'width .5s',
                }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 20, minWidth: 48 }}>{progress}%</span>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
              {completed} / {tasks.length} görev tamamlandı
            </div>
            {/* Durum özeti */}
            <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                { label:'Planlandı',   value: tasks.filter(t=>t.status==='Planlandı').length,   color:'#9CA3AF' },
                { label:'Devam Ediyor',value: tasks.filter(t=>t.status==='Devam Ediyor').length, color:'#F97316' },
                { label:'Tamamlandı',  value: tasks.filter(t=>t.status==='Tamamlandı').length,  color:'#22C55E' },
                { label:'Gecikmiş',    value: tasks.filter(t=>t.status==='Gecikmiş').length,    color:'#EF4444' },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '4px 10px', borderRadius: 20, background: s.color+'15',
                  color: s.color, fontSize: 12, fontWeight: 700,
                }}>
                  {s.label}: {s.value}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
