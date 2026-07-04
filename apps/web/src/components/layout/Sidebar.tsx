'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '../ui/Icon';
import { useAuthStore } from '@/store/auth.store';

const NAV_ITEMS = [
  { path: '/dashboard',               label: 'Ana Sayfa',            icon: 'home' },
  { path: '/dashboard/stajyerler',    label: 'Stajyerler',           icon: 'users' },
  { path: '/dashboard/is-takip',      label: 'İş Takip Listesi',     icon: 'clipboard-list' },
  { path: '/dashboard/haftalik-plan', label: 'Haftalık Görev Planı', icon: 'calendarCheck' },
  { path: '/dashboard/raporlar',      label: 'Raporlar',             icon: 'bar-chart' },
  { path: '/dashboard/takvim',        label: 'Takvim',               icon: 'calendar' },
  { path: '/dashboard/duyurular',     label: 'Duyurular',            icon: 'bell' },
  { path: '/dashboard/ayarlar',       label: 'Ayarlar',              icon: 'settings' },
];

// Filled Home ikonu (görseldeki gibi — köşe yuvarlatılmış, kapı girişli)
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L2 12h3v9h6v-6h2v6h6v-9h3L12 3z"/>
    </svg>
  );
}

// Filled Users ikonu (görseldeki gibi — büyük+küçük kişi)
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2H3z"/>
      <circle cx="17" cy="9" r="3"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87V21h3z"/>
    </svg>
  );
}

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'home')  return <HomeIcon />;
  if (icon === 'users') return <UsersIcon />;
  return <Icon name={icon} size={20} />;
}

const SIDEBAR_PROMOS: Record<string, string> = {
  '/dashboard':               'Görev planlarını düzenli oluşturun ve stajyerlerin gelişimini kolayca takip edin.',
  '/dashboard/stajyerler':    'Stajyer bilgilerini düzenli tutun, gelişim süreçlerini kolayca takip edin.',
  '/dashboard/is-takip':      'Tüm görevleri listeleyin, durumlarını takip edin ve ilerlemeyi yönetin.',
  '/dashboard/haftalik-plan': 'Görev planlarını düzenli oluşturun ve stajyerlerin gelişimini kolayca takip edin.',
  '/dashboard/raporlar':      'Detaylı raporlar ile stajyer performansını ve süreçleri analiz edin.',
};

// Baş harf avatarı için renk üret (isme göre sabit)
function getAvatarColor(name: string): string {
  const colors = [
    '#3B82F6','#8B5CF6','#EC4899','#F97316',
    '#10B981','#06B6D4','#EF4444','#F59E0B',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// "Zeynep Can" → "ZC"
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const promo = SIDEBAR_PROMOS[pathname] || SIDEBAR_PROMOS['/dashboard'];
  const displayName = user?.name || 'Kullanıcı';
  const initials    = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const roleLabel   = user?.role === 'admin' ? 'Admin'
    : user?.role === 'manager' ? 'Yönetici' : 'Stajyer';

  const handleLogout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  return (
    <>
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <Image
            src="/logo.png"
            alt="ElectromTech Logo"
            width={64}
            height={64}
            style={{
              width: 64, height: 64,
              borderRadius: 10,
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
          <span className="sidebar-title">Stajyer Takip<br />Sistemi</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + '/') && item.path !== '/dashboard';
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={onClose}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Promo */}
        <div className="sidebar-promo">
          <div className="sidebar-promo-icon">
            <Icon name="clipboard" size={40} />
          </div>
          {promo}
        </div>

        {/* User — baş harf avatarı */}
        <div className="sidebar-user" onClick={handleLogout} title="Çıkış Yap">
          {/* Baş harf yuvarlak avatar */}
          <div
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 0.5,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
          <Icon name="logout" size={16} />
        </div>
      </aside>
    </>
  );
}
