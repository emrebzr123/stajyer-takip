'use client';
import React, { useState } from 'react';
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
  // NOT: Önceki mantık her zaman [1,2,3,4,5] üretiyordu — mevcut sayfaya
  // (page) hiç bakmıyordu. 5'ten fazla sayfa olduğunda 6. sayfaya ve
  // sonrasına numaralı butonlarla ASLA doğrudan atlanamıyordu (sadece
  // ‹ › okuyla teker teker ilerlemek mümkündü). Şimdi mevcut sayfayı
  // ortada tutan gerçek bir kayan pencere kullanılıyor + aşağıda herhangi
  // bir sayfa numarasını YAZIP doğrudan atlayabileceğiniz bir kutu var
  // (ör. 20 sayfa varken tek tıkla 8. sayfaya gidebilirsiniz — pencerede
  // görünmese bile).
  const windowSize = 5;
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  let start = Math.max(1, safePage - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > safeTotalPages) {
    end = safeTotalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const goTo = (p: number) => {
    if (p < 1 || p > safeTotalPages || p === safePage) return;
    onPageChange(p);
  };

  // "Sayfaya git" kutusu — herhangi bir sayfa numarasını yazıp Enter'a
  // basarak (ya da Git butonuna tıklayarak) doğrudan o sayfaya atlar.
  const [jumpValue, setJumpValue] = useState('');
  const handleJump = () => {
    const n = parseInt(jumpValue, 10);
    if (!isNaN(n)) goTo(n);
    setJumpValue('');
  };

  return (
    <div className="table-footer">
      <span>{total} {label} listeleniyor</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="pagination">
          <button
            type="button"
            className="page-btn"
            onClick={() => goTo(safePage - 1)}
            disabled={safePage <= 1}
          >
            <Icon name="chevronLeft" size={16} />
          </button>

          {start > 1 && (
            <>
              <button type="button" className="page-btn" onClick={() => goTo(1)}>1</button>
              {start > 2 && <span style={{ padding: '0 4px', color: 'var(--text-secondary)' }}>…</span>}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`page-btn${safePage === p ? ' active' : ''}`}
              onClick={() => goTo(p)}
            >
              {p}
            </button>
          ))}

          {end < safeTotalPages && (
            <>
              {end < safeTotalPages - 1 && <span style={{ padding: '0 4px', color: 'var(--text-secondary)' }}>…</span>}
              <button type="button" className="page-btn" onClick={() => goTo(safeTotalPages)}>{safeTotalPages}</button>
            </>
          )}

          <button
            type="button"
            className="page-btn"
            onClick={() => goTo(safePage + 1)}
            disabled={safePage >= safeTotalPages}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>

        {/* Doğrudan sayfa numarasına atlama — sadece 1'den fazla sayfa varsa göster */}
        {safeTotalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              min={1}
              max={safeTotalPages}
              placeholder={`1-${safeTotalPages}`}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              style={{
                width: 64, padding: '5px 8px', borderRadius: 6,
                border: '1px solid var(--border)', fontSize: 12, textAlign: 'center',
              }}
            />
            <button
              type="button"
              onClick={handleJump}
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)',
              }}
            >
              Git
            </button>
          </div>
        )}

        <div className="per-page">
          {limit} / sayfa <Icon name="chevron" size={14} />
        </div>
      </div>
    </div>
  );
}
