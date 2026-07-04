'use client';
import React from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open, title = 'Emin misiniz?', message,
  onConfirm, onClose, loading,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alertCircle" size={18} />
            {title}
          </span>
          <button className="action-btn" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>İptal</Button>
          <button
            className="btn-primary"
            style={{ background: 'var(--red)' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Siliniyor…' : 'Evet, Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
