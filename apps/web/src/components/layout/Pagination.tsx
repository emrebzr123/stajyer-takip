'use client';
import React from 'react';
import Icon from '../ui/Icon';

interface PaginationProps {
  total: number;
  label: string;
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (p: number) => void;
}

export default function Pagination({
  total, label, page, totalPages, limit, onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return (
    <div className="table-footer">
      <span>{total} {label} listeleniyor</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <Icon name="chevronLeft" size={16} />
          </button>

          {pages.map((p) => (
            <button
              key={p}
              className={`page-btn${page === p ? ' active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="page-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
        <div className="per-page">
          {limit} / sayfa <Icon name="chevron" size={14} />
        </div>
      </div>
    </div>
  );
}
