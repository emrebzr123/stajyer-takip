'use client';
import React, { useState } from 'react';
import Icon from '../ui/Icon';
import toast from 'react-hot-toast';

interface MessagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  konu: string;
  mesaj: string;
  title: string;
}

export default function MessagePreviewModal({ open, onClose, konu, mesaj, title }: MessagePreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mesaj);
    setCopied(true);
    toast.success('Mesaj panoya kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <span className="modal-title">📧 {title}</span>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            background: '#F0FDF4', border: '1px solid #BBF7D0',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>📌 KONU: </span>
            <span style={{ fontSize: 13, color: '#166534' }}>{konu}</span>
          </div>
          <div style={{
            background: '#F8FAFC', border: '1px solid var(--border)',
            borderRadius: 8, padding: 16, fontFamily: 'monospace',
            fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap',
            maxHeight: 400, overflowY: 'auto', color: '#1E293B',
          }}>
            {mesaj}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="clipboard" size={15} />
            {copied ? 'Kopyalandı ✓' : 'Mesajı Kopyala'}
          </button>
          <button className="btn-primary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
