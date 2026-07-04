'use client';
import React from 'react';

interface ProgressBarProps {
  value: number;
  color?: string;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  color = '#22C55E',
  showLabel = false,
}: ProgressBarProps) {
  return (
    <>
      <div className="progress-bar-wrap">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="progress-pct">{value}%</span>
      )}
    </>
  );
}
