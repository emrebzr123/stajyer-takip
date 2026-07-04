'use client';
import React from 'react';
import { getInitials, getAvatarColor } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}

const sizeClass = { sm: 'avatar-sm', md: '', lg: 'avatar-lg' };

export default function Avatar({ name, size = 'md', src }: AvatarProps) {
  const cls = ['avatar', sizeClass[size]].filter(Boolean).join(' ');

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cls}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  return (
    <div className={cls} style={{ background: getAvatarColor(name) }}>
      {getInitials(name)}
    </div>
  );
}
