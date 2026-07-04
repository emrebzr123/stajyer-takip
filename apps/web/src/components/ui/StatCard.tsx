'use client';
import React from 'react';
import Icon from './Icon';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color: string;
  trend?: string;
  trendType?: 'up-green' | 'up-red';
  pct?: string;
  small?: boolean;
}

export default function StatCard({
  label, value, sub, icon, color,
  trend, trendType, pct, small,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-icon ${color}`}>
          <Icon name={icon} size={18} />
        </div>
      </div>
      <div className={`stat-value${small ? ' small' : ''}`}>{value}</div>
      <div className="stat-footer">
        {sub && <span className="stat-subtext">{sub}</span>}
        {trend && (
          <span className={`trend ${trendType || ''}`}>
            <Icon name="chart" size={10} />
            {trend}
          </span>
        )}
        {pct && (
          <span className="trend" style={{ color: `var(--${color === 'gray' ? 'gray-text' : color})` }}>
            {pct}
          </span>
        )}
      </div>
    </div>
  );
}
