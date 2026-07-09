'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import NotificationBell from '@/components/layout/NotificationBell';
import Icon from '@/components/ui/Icon';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  // Mobil hamburger menü — önceden sidebar bileşeni isOpen/onClose kabul
  // etmesine rağmen hiç kullanılmıyordu; <900px genişlikte sidebar CSS ile
  // ekran dışına itiliyor ama açmanın HİÇBİR yolu yoktu, uygulama telefonda
  // navigasyonsuz kalıyordu.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#F8FAFC',
      }}>
        <div style={{ color: '#94A3B8', fontSize: 14 }}>Yükleniyor…</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    // %90 zoom — masaüstünde tüm dashboard %90 boyutunda görünür; mobilde
    // (bkz. globals.css @media 900px) bu sıfırlanır.
    <div className="app-zoom-wrapper" style={{ zoom: '90%' }}>
      <div className="app-layout">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Menüyü aç">
          <Icon name="menu" size={20} />
        </button>
        <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <NotificationBell />
        <main className="main-content">
          <div className="page-wrapper">{children}</div>
        </main>
      </div>
    </div>
  );
}
