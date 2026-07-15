'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const NAV = [
  { path: '/stajyer/dashboard',          label: 'Ana Sayfa',      icon: '🏠' },
  { path: '/stajyer/dashboard/gorevler', label: 'Görevlerim',     icon: '📋' },
  { path: '/stajyer/dashboard/plan',     label: 'Haftalık Planım',icon: '📅' },
  { path: '/stajyer/dashboard/belgeler', label: 'Belgelerim',     icon: '📎' },
  { path: '/stajyer/dashboard/duyurular',label: 'Duyurular',      icon: '🔔' },
  { path: '/stajyer/dashboard/profil',   label: 'Profilim',       icon: '👤' },
];

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('');
}
function getColor(name: string) {
  const colors = ['#3B82F6','#8B5CF6','#EC4899','#F97316','#10B981'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
}

interface StajyerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function StajyerSidebar({ isOpen, onClose }: StajyerSidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const name = user?.name || 'Stajyer';

  return (
    <>
      {/* Mobilde sidebar açıkken arka planı karart, dışına tıklayınca kapat */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div style={{ flexShrink: 0 }}>
          <Image src="/logo.png" alt="Logo" width={56} height={56}
            style={{ width:56, height:56, borderRadius:8, objectFit:'cover', mixBlendMode:'multiply' }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', lineHeight:1.3 }}>
          <span style={{ fontWeight:800, fontSize:13, letterSpacing:0.5, color:'var(--text-primary)' }}>Görev Takip</span>
          <span style={{ fontWeight:700, fontSize:12, color:'var(--text-primary)' }}>Sistemi</span>
        </div>
      </div>

      {/* Stajyer badge */}
      <div style={{
        margin:'0 12px 8px', padding:'8px 12px', borderRadius:8,
        background:'#EFF6FF', border:'1px solid #BFDBFE',
        fontSize:12, color:'#1D4ED8', fontWeight:600,
        display:'flex', alignItems:'center', gap:6,
      }}>
        🎓 Stajyer Paneli
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Promo */}
      <div className="sidebar-promo">
        <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
        Görevlerini tamamla ve ilerleme durumunu takip et.
      </div>

      {/* User */}
      <div className="sidebar-user" onClick={() => { clearAuth(); router.push('/auth/login'); }} title="Çıkış Yap">
        <div style={{
          width:36, height:36, borderRadius:'50%',
          background: getColor(name),
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:700, fontSize:13, flexShrink:0,
        }}>
          {getInitials(name)}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{name}</div>
          <div className="sidebar-user-role">Stajyer</div>
        </div>
        <span style={{ fontSize:16 }}>→</span>
      </div>
      </aside>
    </>
  );
}
