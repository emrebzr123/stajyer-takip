'use client';
import React from 'react';
import Icon from '../ui/Icon';

interface SelectOption { label: string; value: string }

interface FilterBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  selects?: {
    placeholder: string;
    value: string;
    options: SelectOption[];
    onChange: (v: string) => void;
  }[];
  showFilter?: boolean;
  showExport?: boolean;
  dateRange?: boolean;
  onExport?: () => void;
}

export default function FilterBar({
  search, onSearch,
  selects = [],
  showFilter = true,
  showExport = true,
  dateRange = false,
  onExport,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      {search !== undefined && (
        <div className="search-input">
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder={search}
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      )}

      {dateRange && (
        <div className="date-range">
          <Icon name="calendar" size={16} />
          01 May 2024 - 31 May 2024
        </div>
      )}

      {selects.map((s, i) => (
        <select
          key={i}
          className="filter-select"
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          style={{ appearance: 'none', paddingRight: 28 }}
        >
          <option value="">{s.placeholder}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      <div className="filter-actions">
        {showExport && (
          <button className="btn-secondary" onClick={onExport}>
            <Icon name="download" size={16} /> Dışa Aktar
          </button>
        )}
        {showFilter && (
          <button className="btn-secondary">
            <Icon name="filter" size={16} /> Filtrele
          </button>
        )}
      </div>
    </div>
  );
}
