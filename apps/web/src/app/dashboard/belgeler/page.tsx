'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import { documentsApi, internsApi, fileUrl } from '@/lib/api';
import toast from 'react-hot-toast';

const MAX_SIZE_MB = 10;

function fmtSize(bytes: number): string {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Dosya türüne göre emoji
function fileEmoji(mime: string): string {
  if (!mime) return '📄';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('word') || mime.includes('document')) return '📘';
  if (mime.includes('sheet') || mime.includes('excel')) return '📗';
  if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
  return '📄';
}

// Yönetici → stajyer(ler) belge paylaşım formu. Ya "Tüm Stajyerler" toggle'ı
// ya da checkbox listesinden seçilen kişilerle paylaşılabilir. Paylaşılan
// belge, alıcı stajyerin "Belgelerim" sayfasında otomatik görünür ve zil
// bildirimi düşer (backend: DocumentsService.shareWithInterns).
function ShareDocumentForm({ interns, onShared }: { interns: any[]; onShared: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [shareWithAll, setShareWithAll] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredInterns = interns.filter((i: any) =>
    !search || (i.user?.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => {
    setFile(null); setShareWithAll(true); setSelected(new Set()); setSearch('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleShare = async () => {
    if (!file) { toast.error('Lütfen bir dosya seçin.'); return; }
    if (!shareWithAll && selected.size === 0) {
      toast.error('En az bir stajyer seçin ya da "Tüm Stajyerler" seçeneğini işaretleyin.');
      return;
    }
    setSending(true);
    try {
      const r = await documentsApi.share(file, Array.from(selected), shareWithAll);
      const count = r.data?.recipientCount ?? (shareWithAll ? interns.length : selected.size);
      toast.success(`📎 Belge ${count} stajyerle paylaşıldı.`);
      reset();
      setOpen(false);
      onShared();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Belge paylaşılamadı.');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16,
        }}>
        <Icon name="plus" size={15} /> Stajyerlerle Belge Paylaş
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>📎 Stajyerlerle Belge Paylaş</div>
        <button onClick={() => { reset(); setOpen(false); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Dosya seçimi */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? '#22C55E' : '#CBD5E1'}`, borderRadius: 10,
          padding: '18px', textAlign: 'center', cursor: 'pointer',
          background: file ? '#F0FDF4' : '#F8FAFC', marginBottom: 16,
        }}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > MAX_SIZE_MB * 1024 * 1024) {
              toast.error(`Dosya çok büyük — en fazla ${MAX_SIZE_MB} MB.`);
              return;
            }
            setFile(f);
          }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip" />
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {file ? `✅ ${file.name}` : '📤 Dosya seçmek için tıklayın (en fazla 10 MB)'}
        </div>
      </div>

      {/* Alıcı seçimi */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, fontWeight: 700, fontSize: 13 }}>
          <input type="checkbox" checked={shareWithAll} onChange={e => setShareWithAll(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
          🌐 Tüm Stajyerlerle Paylaş ({interns.length} kişi)
        </label>

        {!shareWithAll && (
          <div>
            <input
              className="form-input"
              placeholder="Stajyer ara…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 8, fontSize: 13 }}
            />
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
              {filteredInterns.length === 0 ? (
                <div style={{ padding: 10, fontSize: 13, color: 'var(--text-secondary)' }}>Stajyer bulunamadı.</div>
              ) : filteredInterns.map((i: any) => (
                <label key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', cursor: 'pointer', borderRadius: 6 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)}
                    style={{ width: 15, height: 15, accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: 13 }}>{i.user?.name}</span>
                </label>
              ))}
            </div>
            {selected.size > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                {selected.size} stajyer seçildi
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={handleShare} disabled={sending || !file}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
          background: sending || !file ? '#CBD5E1' : '#22C55E', color: '#fff',
          fontWeight: 700, fontSize: 13, cursor: sending || !file ? 'not-allowed' : 'pointer',
        }}>
        {sending ? 'Paylaşılıyor…' : '📨 Paylaş'}
      </button>
    </div>
  );
}

export default function BelgelerPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [interns, setInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [internFilter, setInternFilter] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      documentsApi.getAll(),
      internsApi.getAll({ limit: 500 }),
    ]).then(([dRes, iRes]) => {
      setDocs(dRes.data || []);
      setInterns(iRes.data?.data || iRes.data || []);
    }).catch(() => toast.error('Belgeler yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // internId → stajyer adı eşlemesi
  const internNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of interns) m.set(i.id, i.user?.name || i.name || '—');
    return m;
  }, [interns]);

  const filtered = internFilter ? docs.filter(d => d.internId === internFilter) : docs;

  const handleDelete = async (doc: any) => {
    if (confirmId !== doc.id) { setConfirmId(doc.id); return; }
    try {
      await documentsApi.remove(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Belge silindi.');
    } catch {
      toast.error('Belge silinemedi.');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Belgeler"
        subtitle="Stajyerlerin yüklediği belgeler — indirin, inceleyin veya silin. Ayrıca kendi belgelerinizi stajyerlerle paylaşabilirsiniz."
      />

      <ShareDocumentForm interns={interns} onShared={load} />

      {/* Stajyer filtresi */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-input"
          style={{ maxWidth: 280 }}
          value={internFilter}
          onChange={e => setInternFilter(e.target.value)}
        >
          <option value="">Tüm Stajyerler</option>
          {interns.map((i: any) => (
            <option key={i.id} value={i.id}>{i.user?.name || i.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {filtered.length} belge
        </span>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Yükleniyor…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Henüz belge yok</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Stajyerler panellerindeki "Belgelerim" sekmesinden belge yüklediğinde burada listelenecek
            ve size bildirim düşecek.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((doc, idx) => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{fileEmoji(doc.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 14,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {doc.internId && (
                    <span style={{ fontWeight: 600, color: '#2563EB' }}>
                      🎓 {internNameById.get(doc.internId) || 'Stajyer'} ·{' '}
                    </span>
                  )}
                  {doc.sharedWithAll && (
                    <span style={{ fontWeight: 600, color: '#16A34A' }}>🌐 Tüm stajyerlerle paylaşıldı · </span>
                  )}
                  {!doc.internId && !doc.sharedWithAll && doc.uploadedBy?.role !== 'intern' && (
                    <span style={{ fontWeight: 600, color: '#9333EA' }}>👥 Seçili stajyerlerle paylaşıldı · </span>
                  )}
                  {fmtSize(doc.size)} · {fmtDate(doc.createdAt)}
                  {doc.uploadedBy?.name && <> · Yükleyen: {doc.uploadedBy.name}</>}
                </div>
              </div>

              <a
                href={fileUrl(doc.url)}
                target="_blank"
                rel="noopener noreferrer"
                title="İndir / Görüntüle"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 12px', borderRadius: 8,
                  background: '#EFF6FF', color: '#2563EB',
                  fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0,
                }}
              >
                <Icon name="download" size={14} /> İndir
              </a>

              {confirmId === doc.id ? (
                <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => handleDelete(doc)}
                    style={{
                      border: 'none', background: '#EF4444', color: '#fff',
                      borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                    }}>
                    Emin misin?
                  </button>
                  <button onClick={() => setConfirmId(null)}
                    style={{
                      border: 'none', background: '#F1F5F9',
                      borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 11,
                    }}>
                    Vazgeç
                  </button>
                </span>
              ) : (
                <button onClick={() => handleDelete(doc)} title="Sil"
                  style={{
                    border: 'none', background: '#FEF2F2', color: '#EF4444',
                    borderRadius: 8, padding: 8, cursor: 'pointer',
                    display: 'flex', flexShrink: 0,
                  }}>
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
