'use client';
import React from 'react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Icon from '../ui/Icon';

interface InternDrawerProps {
  intern: any;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | string[] }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
        {Array.isArray(value) ? value.join(', ') : value}
      </div>
    </div>
  );
}

export default function InternDrawer({ intern, onClose }: InternDrawerProps) {
  const name = intern.user?.name || '-';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 998,
          animation: 'fadeIn .2s',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: '#fff', zIndex: 999, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        animation: 'slideIn .25s ease',
      }}>
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
          @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        `}</style>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Stajyer Detayları</span>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {/* Profil */}
        <div style={{ padding: 24, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <Avatar name={name} size="lg" />
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 12 }}>{name}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{intern.user?.email}</div>
          <div style={{ marginTop: 8 }}>
            <Badge text={intern.status} />
          </div>
          {intern.company && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
              🏢 {intern.company.name}
            </div>
          )}
        </div>

        {/* Detaylar */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Kişisel Bilgiler
          </div>
          <InfoRow label="Telefon"    value={intern.phone} />
          <InfoRow label="TC Kimlik"  value={intern.tcNo} />
          <InfoRow label="Doğum Tarihi" value={intern.birthDate} />
          <InfoRow label="Adres"      value={intern.address} />

          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Akademik Bilgiler
          </div>
          <InfoRow label="Üniversite"      value={intern.university} />
          <InfoRow label="Akademik Bölüm"  value={intern.academicDepartment} />
          <InfoRow label="Not Ortalaması"  value={intern.gpa} />

          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Staj Bilgileri
          </div>
          <InfoRow label="Firma"          value={intern.company?.name} />
          <InfoRow label="Departman"      value={intern.department?.name} />
          <InfoRow label="Mentör"         value={intern.mentor?.name} />
          <InfoRow label="Dönem"          value={intern.term} />
          <InfoRow label="Staj Türü"      value={intern.internType} />
          <InfoRow label="Çalışma Şekli"  value={intern.workType} />
          {intern.workType === 'Hibrit' && (
            <InfoRow label="Hibrit Günler" value={intern.hybridDays} />
          )}
          <InfoRow label="Başlangıç"  value={intern.startDate} />
          <InfoRow label="Bitiş"      value={intern.endDate} />

          {intern.notes && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Notlar
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {intern.notes}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
