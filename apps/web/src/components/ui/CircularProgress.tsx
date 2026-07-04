'use client';
import React from 'react';

interface CircularProgressProps {
  value: number;
}

export default function CircularProgress({ value }: CircularProgressProps) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 75 ? '#22C55E'
    : value >= 50 ? '#3B82F6'
    : value >= 25 ? '#F97316'
    : '#EF4444';

  return (
    <div className="circular-progress">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#F3F4F6" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <span className="circular-progress-text">{value}%</span>
    </div>
  );
}
