'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import YoneticiSidebar from '@/components/layout/YoneticiSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import Icon from '@/components/ui/Icon';

export default function YoneticiLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Hızlı ekle (+) butonu — SADECE Ana Sayfa'da görünüyor (bildirim
  // ikonunun yanında). Tıklanınca "Proje Ekle"/"Görev Ekle" seçenekleri
  // açılıyor, tekrar tıklanınca küçük daireye geri dönüyor.
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const isAnaSayfa = pathname === '/yonetici/dashboard';

  // Sayfa değişince (örn. Görevler'e gidince) açık kalmış olabilecek
  // menüyü kapatalım — bir daha Ana Sayfa'ya dönüldüğünde temiz başlasın.
  useEffect(() => { setQuickAddOpen(false); }, [pathname]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace('/auth/login');
    // Sadece admin (Yönetici) bu panele girebilir — Personel (manager) ve
    // stajyer kendi panellerine yönlendirilir.
    if (_hasHydrated && isAuthenticated && user?.role !== 'admin') {
      if (user?.role === 'intern') router.replace('/stajyer/dashboard');
      else router.replace('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  if (!_hasHydrated) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F8FAFC' }}>
      <div style={{ color:'#94A3B8', fontSize:14 }}>Yükleniyor…</div>
    </div>
  );

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="app-zoom-wrapper" style={{ zoom: '90%' }}>
      <div className="app-layout">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Menüyü aç">
          <Icon name="menu" size={20} />
        </button>
        <YoneticiSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="main-content">
          <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
            padding: '10px 24px', background: '#fff', borderBottom: '1px solid var(--border)',
          }}>
            {isAnaSayfa && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setQuickAddOpen((o) => !o)}
                  title={quickAddOpen ? 'Kapat' : 'Hızlı ekle'}
                  style={{
                    width: 42, height: 42, borderRadius: '50%', border: 'none',
                    background: '#2563EB', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(37,99,235,.35)',
                    transform: quickAddOpen ? 'rotate(45deg)' : 'none', transition: 'transform .15s',
                  }}
                >
                  <Icon name="plus" size={19} />
                </button>
                {quickAddOpen && (
                  <div style={{
                    position: 'absolute', top: 50, right: 0, zIndex: 60,
                    background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
                    boxShadow: '0 6px 20px rgba(0,0,0,.14)', minWidth: 160, overflow: 'hidden',
                  }}>
                    {/* Görevler sayfasına ?openModal=proje/bolum ile gidiyoruz —
                        o sayfa bu parametreyi okuyup ilgili ekleme modalini
                        otomatik açıyor (bkz. gorevler/page.tsx). */}
                    <button
                      onClick={() => { setQuickAddOpen(false); router.push('/yonetici/dashboard/gorevler?openModal=proje'); }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    >
                      Proje Ekle
                    </button>
                    <button
                      onClick={() => { setQuickAddOpen(false); router.push('/yonetici/dashboard/gorevler?openModal=bolum'); }}
                      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                    >
                      Görev Ekle
                    </button>
                  </div>
                )}
              </div>
            )}
            <NotificationBell />
          </div>
          <div className="page-wrapper">{children}</div>
        </main>
      </div>
    </div>
  );
}
