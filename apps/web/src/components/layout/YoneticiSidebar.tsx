'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '../ui/Icon';
import { useAuthStore } from '@/store/auth.store';

// Yönetici paneli — Personel paneliyle (Sidebar.tsx) KASITLI olarak ayrı
// bir bileşen. Yönetici artık stajyerlerle doğrudan uğraşmıyor; bu yüzden
// navigasyonda stajyer yönetimi (İş Takip, Haftalık Plan, Belgeler vb.)
// hiç yer almıyor — sadece Personel yönetimi ve stajyerlerin "Ana Görev"
// özetini gösteren salt-okunur bir liste var.
const NAV_ITEMS = [
  { path: '/yonetici/dashboard',          label: 'Ana Sayfa',   icon: 'home' },
  { path: '/yonetici/dashboard/personel', label: 'Personel',    icon: 'users' },
  { path: '/yonetici/dashboard/stajyerler', label: 'Stajyerler', icon: 'graduation' },
  { path: '/yonetici/dashboard/sirketler', label: 'Şirketler',  icon: 'building' },
  { path: '/yonetici/dashboard/duyurular', label: 'Duyurular',  icon: 'bell' },
  { path: '/yonetici/dashboard/ayarlar',   label: 'Ayarlar',    icon: 'settings' },
];

function getAvatarColor(name: string): string {
  const colors = ['#1E3A5F','#0F6E6E','#8B5CF6','#F97316','#10B981','#EF4444'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

interface YoneticiSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function YoneticiSidebar({ isOpen, onClose }: YoneticiSidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const displayName = user?.name || 'Yönetici';
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);

  const handleLogout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  return (
    <>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }} onClick={onClose} />
      )}

      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Header — Personel panelindekiyle aynı logo/marka, sadece altında
            küçük bir "YÖNETİCİ" rozeti var ki hangi panelde olduğu net olsun */}
        <div className="sidebar-header">
          <div style={{ flexShrink: 0, background: 'transparent' }}>
            <Image
              src="/logo.png" alt="ElectromTech Logo" width={56} height={56}
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', mixBlendMode: 'multiply', background: 'transparent' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5, color: 'var(--text-primary)' }}>
              Görev Takip
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              Sistemi
            </span>
            <span style={{
              display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 800,
              letterSpacing: 0.8, color: '#1E3A5F', background: '#1E3A5F14',
              padding: '2px 7px', borderRadius: 5, width: 'fit-content',
            }}>
              YÖNETİCİ PANELİ
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (pathname.startsWith(item.path + '/') && item.path !== '/yonetici/dashboard');
            return (
              <Link key={item.path} href={item.path} className={`nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-user" onClick={handleLogout} title="Çıkış Yap">
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 0.5, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">Yönetici</div>
          </div>
          <Icon name="logout" size={16} />
        </div>
      </aside>
    </>
  );
}
