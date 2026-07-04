'use client';
import React from 'react';
import Icon from '@/components/ui/Icon';

interface PlaceholderProps {
  title: string;
  subtitle: string;
  iconName: string;
}

function PlaceholderPage({ title, subtitle, iconName }: PlaceholderProps) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="placeholder-page">
        <div
          style={{
            width: 80, height: 80,
            background: 'var(--primary-light)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)',
            marginBottom: 20,
          }}
        >
          <Icon name={iconName} size={36} />
        </div>
        <h2>{title}</h2>
        <p style={{ marginTop: 8 }}>Bu sayfa yakında eklenecektir.</p>
      </div>
    </>
  );
}

export { PlaceholderPage };
export default PlaceholderPage;
