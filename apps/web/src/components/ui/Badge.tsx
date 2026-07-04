'use client';
import React from 'react';
import { STATUS_MAP } from '@/lib/utils';

interface BadgeProps {
  text: string;
  type?: string;
}

export default function Badge({ text, type }: BadgeProps) {
  const cls = STATUS_MAP[text] || type || 'gray';
  return (
    <span className={`badge badge-${cls}`}>
      <span className="badge-dot" />
      {text}
    </span>
  );
}
