'use client';
import React from 'react';
import Icon from './Icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: string;
  loading?: boolean;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  icon,
  loading,
  children,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const cls = variant === 'primary' ? 'btn-primary' : 'btn-secondary';

  return (
    <button
      className={[cls, className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span style={{ opacity: 0.7 }}>Yükleniyor…</span>
      ) : (
        <>
          {icon && <Icon name={icon} size={16} />}
          {children}
        </>
      )}
    </button>
  );
}
