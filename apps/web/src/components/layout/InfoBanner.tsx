'use client';
import React from 'react';
import Icon from '../ui/Icon';

export default function InfoBanner({ text }: { text: string }) {
  return (
    <div className="info-banner">
      <Icon name="info" size={18} />
      <span>{text}</span>
    </div>
  );
}
