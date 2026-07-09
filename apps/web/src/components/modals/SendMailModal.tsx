'use client';
import React, { useState, useEffect } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const MAIL_TEMPLATES = [
  { label: 'Evrak Eksikliği', subject: 'Eksik Evraklar Hakkında', body: 'Sayın {name},\n\nStaj sürecinizle ilgili bazı evrakların eksik olduğu görülmüştür. Lütfen en kısa sürede teslim ediniz.\n\nSaygılarımızla,' },
  { label: 'Haftalık Hatırlatma', subject: 'Haftalık Görev Hatırlatması', body: 'Sayın {name},\n\nBu hafta tamamlamanız gereken görevlerinizi kontrol etmenizi hatırlatırız.\n\nSaygılarımızla,' },
  { label: 'Toplantı Daveti', subject: 'Toplantı Daveti', body: 'Sayın {name},\n\nSizi yarın saat 10:00\'da düzenlenecek toplantımıza davet ediyoruz.\n\nSaygılarımızla,' },
  { label: 'Staj Başlangıç Bilgilendirmesi', subject: 'Staj Başlangıcınız Hakkında', body: 'Sayın {name},\n\nStajınız başlamaktadır. Başarılar dileriz.\n\nSaygılarımızla,' },
  { label: 'Performans Görüşmesi', subject: 'Performans Değerlendirme Görüşmesi', body: 'Sayın {name},\n\nPerformans değerlendirme görüşmeniz için randevu oluşturulmuştur.\n\nSaygılarımızla,' },
];

interface SendMailModalProps {
  open: boolean;
  onClose: () => void;
  intern: any;
}

export default function SendMailModal({ open, onClose, intern }: SendMailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');
  const [loading, setLoading] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);

  const recipientName  = intern?.user?.name  || '';
  const recipientEmail = intern?.user?.email || '';

  useEffect(() => {
    if (!open) return;
    setSubject(''); setBody('');
    // Kaydedilmiş şablonları yükle
    try {
      const saved = JSON.parse(localStorage.getItem('mail_templates') || '[]');
      setCustomTemplates(saved);
    } catch { setCustomTemplates([]); }
  }, [open]);

  const applyTemplate = (tpl: { subject: string; body: string }) => {
    setSubject(tpl.subject);
    setBody(tpl.body.replace(/\{name\}/g, recipientName));
  };

  const saveAsTemplate = () => {
    if (!templateName.trim()) { toast.error('Şablon adı gerekli.'); return; }
    const tpls = [...customTemplates, { label: templateName, subject, body }];
    localStorage.setItem('mail_templates', JSON.stringify(tpls));
    setCustomTemplates(tpls);
    toast.success('Şablon kaydedildi.');
    setSaveTemplate(false); setTemplateName('');
  };

  const deleteCustomTemplate = (i: number) => {
    const tpls = customTemplates.filter((_,j) => j !== i);
    localStorage.setItem('mail_templates', JSON.stringify(tpls));
    setCustomTemplates(tpls);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast.error('Konu ve mesaj zorunludur.'); return; }
    setLoading(true);
    try {
      await api.post('/mail/send', {
        to: recipientEmail,
        subject,
        text: body,
        internName: recipientName,
      });
      toast.success(`✅ Mail ${recipientEmail} adresine gönderildi!`);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Mail gönderilemedi.');
    } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <span className="modal-title">📧 Mail Gönder — {recipientName}</span>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
          {/* Alıcı */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13 }}>
            📬 <strong>Alıcı:</strong> {recipientName} &lt;{recipientEmail}&gt;
          </div>

          {/* Hazır şablonlar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
              Hazır Şablonlar
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[...MAIL_TEMPLATES, ...customTemplates].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => applyTemplate(t)}
                    style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: '#F8FAFC', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                    {t.label}
                  </button>
                  {i >= MAIL_TEMPLATES.length && (
                    <button onClick={() => deleteCustomTemplate(i - MAIL_TEMPLATES.length)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="form-group">
            <label className="form-label">Konu</label>
            <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Mail konusu" />
          </div>
          <div className="form-group">
            <label className="form-label">Mesaj</label>
            <textarea className="form-textarea" rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Mail içeriği..." />
          </div>

          {/* Şablon kaydet */}
          {saveTemplate ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="form-input" placeholder="Şablon adı" value={templateName} onChange={e => setTemplateName(e.target.value)} style={{ flex: 1 }} />
              <button onClick={saveAsTemplate} style={{ padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Kaydet</button>
              <button onClick={() => setSaveTemplate(false)} style={{ padding: '8px 14px', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>İptal</button>
            </div>
          ) : (
            <button onClick={() => setSaveTemplate(true)}
              style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              💾 Şablon Olarak Kaydet
            </button>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>İptal</Button>
          <Button loading={loading} onClick={handleSend}>📧 Gönder</Button>
        </div>
      </div>
    </div>
  );
}
