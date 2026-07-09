'use client';
import SendMailModal from './SendMailModal';
import React from 'react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Icon from '../ui/Icon';
import { internsApi, tasksApi, documentsApi, fileUrl } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface InternDrawerProps {
  intern: any;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value?: string | string[] }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
        {Array.isArray(value) ? value.join(', ') : value}
      </div>
    </div>
  );
}

export default function InternDrawer({ intern, onClose }: InternDrawerProps) {
  const [mailOpen, setMailOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [confirmResend, setConfirmResend] = React.useState(false);
  // Yerel gönderim durumu — sunucudan gelen intern.evaluationFormSentAt ile başlar,
  // butonla gönderilince anında güncellenir (drawer'ı yenilemeye gerek kalmaz).
  const [sentAt, setSentAt] = React.useState<string | null>(intern.evaluationFormSentAt || null);
  // Stajyerin görevleri, belgeleri ve devam kayıtları — yönetici "bu stajyer
  // ne durumda"yı artık tek ekrandan görür (drawer önceden sadece kimlik
  // bilgisi gösteriyordu).
  const [internTasks, setInternTasks] = React.useState<any[]>([]);
  const [internDocs, setInternDocs] = React.useState<any[]>([]);
  const [attendance, setAttendance] = React.useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      tasksApi.getAll({ internId: intern.id, limit: 100 }),
      documentsApi.getAll({ internId: intern.id }),
      api.get(`/attendance/history?internId=${intern.id}`).catch(() => ({ data: [] })),
    ]).then(([tRes, dRes, aRes]) => {
      setInternTasks(tRes.data?.data || []);
      setInternDocs(dRes.data || []);
      setAttendance((aRes.data || []).slice(0, 7));
    }).catch(() => undefined)
      .finally(() => setDetailsLoading(false));
  }, [intern.id]);

  const name = intern.user?.name || '-';

  const handleSendEvaluation = async (force = false) => {
    setSending(true);
    try {
      const r = await internsApi.sendEvaluationForm(intern.id, force);
      setSentAt(r.data?.sentAt || new Date().toISOString());
      setConfirmResend(false);
      toast.success('📨 Değerlendirme formu stajyerin e-postasına gönderildi.');
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // Daha önce gönderilmiş — yeniden gönderim onayı iste
        setConfirmResend(true);
        toast(e.response.data?.message || 'Form daha önce gönderilmiş.', { icon: 'ℹ️' });
      } else {
        toast.error(e?.response?.data?.message || 'Form gönderilemedi.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 998,
          animation: 'fadeIn .2s',
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: '#fff', zIndex: 999, overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        animation: 'slideIn .25s ease',
      }}>
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
          @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        `}</style>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Stajyer Detayları</span>
          <button onClick={() => setMailOpen(true)} style={{ padding:'6px 14px', borderRadius:8, background:'var(--primary)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer' }}>📧 Mail Gönder</button>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {/* Profil */}
        <div style={{ padding: 24, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
          <Avatar name={name} size="lg" />
          <div style={{ fontWeight: 700, fontSize: 18, marginTop: 12 }}>{name}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{intern.user?.email}</div>
          <div style={{ marginTop: 8 }}>
            <Badge text={intern.status} />
          </div>
          {intern.company && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
              🏢 {intern.company.name}
            </div>
          )}
        </div>

        {/* Detaylar */}
        <div style={{ padding: '0 24px 24px' }}>
          {/* ── Görevler ── */}
          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📋 Görevler ({internTasks.length})
          </div>
          {detailsLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
          ) : internTasks.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Atanmış görev yok.</div>
          ) : internTasks.slice(0, 6).map((t: any) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.status} · Son: {new Date(t.dueDate).toLocaleDateString('tr-TR')}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: t.progress === 100 ? '#22C55E' : 'var(--text-secondary)', flexShrink: 0 }}>
                %{t.progress}
              </span>
            </div>
          ))}

          {/* ── Belgeler ── */}
          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📎 Belgeler ({internDocs.length})
          </div>
          {detailsLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
          ) : internDocs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Yüklenmiş belge yok.</div>
          ) : internDocs.slice(0, 5).map((d: any) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              <a href={fileUrl(d.url)} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textDecoration: 'none', flexShrink: 0 }}>
                İndir
              </a>
            </div>
          ))}

          {/* ── Devam (son 7 kayıt) ── */}
          {attendance.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🕐 Devam Kaydı (son {attendance.length})
              </div>
              {attendance.map((a: any) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 12, borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontWeight: 600, minWidth: 84 }}>{new Date(a.date).toLocaleDateString('tr-TR')}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Giriş: {a.checkIn ? new Date(a.checkIn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    {' · '}Çıkış: {a.checkOut ? new Date(a.checkOut).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
            </>
          )}

          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Kişisel Bilgiler
          </div>
          <InfoRow label="Telefon"    value={intern.phone} />
          <InfoRow label="TC Kimlik"  value={intern.tcNo} />
          <InfoRow label="Doğum Tarihi" value={intern.birthDate} />
          <InfoRow label="Adres"      value={intern.address} />

          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Akademik Bilgiler
          </div>
          <InfoRow label="Üniversite"      value={intern.university} />
          <InfoRow label="Akademik Bölüm"  value={intern.academicDepartment} />
          <InfoRow label="Not Ortalaması"  value={intern.gpa} />

          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Staj Bilgileri
          </div>
          <InfoRow label="Firma"          value={intern.company?.name} />
          <InfoRow label="Departman"      value={intern.department?.name} />
          <InfoRow label="Mentör"         value={intern.mentor?.name} />
          <InfoRow label="Dönem"          value={intern.term} />
          <InfoRow label="Staj Türü"      value={intern.internType} />
          <InfoRow label="Çalışma Şekli"  value={intern.workType} />
          {intern.workType === 'Hibrit' && (
            <InfoRow label="Hibrit Günler" value={intern.hybridDays} />
          )}
          <InfoRow label="Başlangıç"  value={intern.startDate} />
          <InfoRow label="Bitiş"      value={intern.endDate} />

          {/* ── Staj Sonu Değerlendirme Formu ─────────────────────────────
              Google Anket linki stajyerin e-postasına gönderilir. Staj
              bitiminden sonraki gün gönderilmemişse otomatik de gönderilir. */}
          <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Staj Sonu Değerlendirme
          </div>
          {sentAt && !confirmResend && (
            <div style={{
              fontSize: 12, color: '#16A34A', background: '#F0FDF4',
              border: '1px solid #BBF7D0', borderRadius: 8,
              padding: '8px 12px', marginBottom: 10, fontWeight: 600,
            }}>
              ✅ Form {new Date(sentAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} tarihinde gönderildi.
            </div>
          )}
          {confirmResend ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleSendEvaluation(true)}
                disabled={sending}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: '#F97316', color: '#fff', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}>
                {sending ? 'Gönderiliyor…' : '🔁 Evet, yeniden gönder'}
              </button>
              <button
                onClick={() => setConfirmResend(false)}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: '#F1F5F9', color: 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                Vazgeç
              </button>
            </div>
          ) : (
            <button
              onClick={() => (sentAt ? setConfirmResend(true) : handleSendEvaluation(false))}
              disabled={sending}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                background: sentAt ? '#F1F5F9' : 'var(--primary)',
                color: sentAt ? 'var(--text-secondary)' : '#fff',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
              {sending ? 'Gönderiliyor…' : sentAt ? '🔁 Formu Yeniden Gönder' : '📋 Değerlendirme Formu Gönder'}
            </button>
          )}

          {intern.notes && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, padding: '16px 0 8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Notlar
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {intern.notes}
              </div>
            </>
          )}
        </div>
      </div>
      {mailOpen && <SendMailModal open={mailOpen} onClose={() => setMailOpen(false)} intern={intern} />}
    </>
  );
}
