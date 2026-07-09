'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Icon from '../ui/Icon';

// Bildirim türüne göre küçük emoji rozeti
const TYPE_EMOJI: Record<string, string> = {
  task_assigned: '📋',
  task_completed: '✅',
  task_overdue: '🚨',
  task_comment: '💬',
  due_reminder: '⏰',
  document_uploaded: '📎',
  document_shared: '📨',
  internship_ending: '🎓',
  internship_ended: '🏁',
  evaluation_sent: '📨',
  announcement: '📢',
  general: '🔔',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.floor(hr / 24);
  return `${day} gün önce`;
}

// Sağ üstte sabit duran zil ikonu. 30 saniyede bir okunmamış sayısını
// yoklar (polling); açılınca listeyi çeker. Bildirime tıklanınca okundu
// işaretlenir ve varsa link'e gidilir.
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Push bildirimi — telefon kilitliyken/uygulama kapalıyken de bildirim
  // görebilmek için. İzin isteği yalnızca kullanıcı "Bildirimleri Aç"
  // butonuna tıkladığında yapılır (bkz. banner aşağıda).
  const pushNotif = usePushNotifications();

  const refreshCount = useCallback(() => {
    notificationsApi.unreadCount()
      .then(r => setUnread(r.data?.count ?? 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const r = await notificationsApi.getAll();
      setItems(r.data || []);
    } catch { /* sessiz */ }
    finally { setLoading(false); }
  };

  const openList = async () => {
    const next = !open;
    setOpen(next);
    if (next) await fetchList();
  };

  const handleClick = async (n: any) => {
    if (!n.isRead) {
      setItems(prev => prev.map(i => i.id === n.id ? { ...i, isRead: true } : i));
      setUnread(u => Math.max(0, u - 1));
      notificationsApi.markRead(n.id).catch(() => undefined);
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const handleMarkAll = async () => {
    setItems(prev => prev.map(i => ({ ...i, isRead: true })));
    setUnread(0);
    notificationsApi.markAllRead().catch(() => undefined);
  };

  // Tekil bildirim silme (✕) — hem okunmuş hem okunmamış silinebilir;
  // okunmamışsa rozet sayısını da düşürür.
  const handleRemove = async (n: any, e: React.MouseEvent) => {
    e.stopPropagation(); // satırdaki onClick (okundu yap + yönlendir) tetiklenmesin
    setItems(prev => prev.filter(i => i.id !== n.id));
    if (!n.isRead) setUnread(u => Math.max(0, u - 1));
    try {
      await notificationsApi.remove(n.id);
    } catch {
      // Başarısızsa listeyi geri getir
      setItems(prev => [...prev, n].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    }
  };

  // Okunmuş tüm bildirimleri temizler — okunmamışlar korunur.
  const handleClearRead = async () => {
    const removedUnread = items.filter(i => !i.isRead);
    setItems(removedUnread);
    try {
      await notificationsApi.clearRead();
    } catch {
      // Başarısızsa listeyi yeniden çek
      await fetchList();
    }
  };

  const hasRead = items.some(i => i.isRead);

  return (
    <div ref={ref} style={{ position: 'fixed', top: 16, right: 24, zIndex: 1000 }}>
      <button
        onClick={openList}
        title="Bildirimler"
        style={{
          position: 'relative',
          width: 42, height: 42, borderRadius: '50%',
          border: '1px solid var(--border)', background: '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,.08)', color: 'var(--text-primary)',
        }}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, padding: '0 4px',
            borderRadius: 9, background: '#EF4444', color: '#fff',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 50, right: 0, width: 360, maxWidth: '90vw',
          background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,.14)', overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 8,
          }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>🔔 Bildirimler</span>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              {hasRead && (
                <button onClick={handleClearRead}
                  title="Okunmuş bildirimleri kalıcı olarak sil"
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
                  }}>
                  Okunanları Temizle
                </button>
              )}
              {unread > 0 && (
                <button onClick={handleMarkAll}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontSize: 12, fontWeight: 700,
                  }}>
                  Tümünü okundu yap
                </button>
              )}
            </div>
          </div>

          {/* Push bildirimi banner'ı — telefon kilitliyken/uygulama kapalıyken
              de bildirim alabilmek için tek tıkla açma. Sadece destekleniyorsa
              VE henüz izin sorulmamış/abone olunmamışsa gösterilir; bir kez
              kapatılan bir tercih değil, gerçek tarayıcı/abonelik durumuna göre
              otomatik gizlenir. */}
          {pushNotif.supported && pushNotif.permission !== 'denied' && !pushNotif.subscribed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: '#EFF6FF', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                📲 Telefon kilitliyken de bildirim almak ister misiniz?
              </span>
              <button
                onClick={pushNotif.enable}
                disabled={pushNotif.busy}
                style={{
                  border: 'none', background: 'var(--primary)', color: '#fff',
                  borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}>
                {pushNotif.busy ? '…' : 'Bildirimleri Aç'}
              </button>
            </div>
          )}

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                Yükleniyor…
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                Henüz bildirim yok.
              </div>
            ) : items.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 16px',
                  borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                  background: n.isRead ? '#fff' : '#EFF6FF',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = n.isRead ? '#F8FAFC' : '#DBEAFE')}
                onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? '#fff' : '#EFF6FF')}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_EMOJI[n.type] || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: n.isRead ? 500 : 800,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {n.title}
                  </div>
                  {n.message && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {n.message}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--primary)', flexShrink: 0, marginTop: 6,
                  }} />
                )}
                <button
                  onClick={(e) => handleRemove(n, e)}
                  title="Bildirimi sil"
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: '#94A3B8', fontSize: 14, flexShrink: 0,
                    padding: 4, lineHeight: 1, alignSelf: 'flex-start',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
