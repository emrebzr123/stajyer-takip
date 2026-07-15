'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import YoneticiSidebar from '@/components/layout/YoneticiSidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import Icon from '@/components/ui/Icon';

export default function YoneticiLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            padding: '10px 24px', background: '#fff', borderBottom: '1px solid var(--border)',
          }}>
            <NotificationBell />
          </div>
          <div className="page-wrapper">{children}</div>
        </main>
      </div>
    </div>
  );
}
