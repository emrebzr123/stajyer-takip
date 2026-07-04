'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Zustand localStorage'ı okurken bekle — redirect loop önlenir
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
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-wrapper">{children}</div>
      </main>
    </div>
  );
}
