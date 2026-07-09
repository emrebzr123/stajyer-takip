'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { documentsApi, fileUrl } from '@/lib/api';
import toast from 'react-hot-toast';

const MAX_SIZE_MB = 10;

function fmtSize(bytes: number): string {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileEmoji(mime: string): string {
  if (!mime) return '📄';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('word') || mime.includes('document')) return '📘';
  if (mime.includes('sheet') || mime.includes('excel')) return '📗';
  if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
  return '📄';
}

export default function BelgelerimPage() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!user?.internId) { setLoading(false); return; }
    setLoading(true);
    // Backend artık hem stajyerin kendi yüklediği belgeleri HEM DE yönetimin
    // bu stajyerle paylaştığı belgeleri (seçili ya da "tüm stajyerler")
    // birlikte döner — tek istekle.
    documentsApi.getAll({ internId: user.internId })
      .then(r => setDocs(r.data || []))
      .catch(() => toast.error('Belgeler yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Dosya çok büyük — en fazla ${MAX_SIZE_MB} MB yükleyebilirsiniz.`);
      return;
    }
    setUploading(true);
    try {
      // internId'yi backend zaten JWT'den alıyor; yine de gönderiyoruz
      const res = await documentsApi.upload(file, user?.internId);
      setDocs(prev => [res.data, ...prev]);
      toast.success('📎 Belge yüklendi! Yöneticinize bildirim gönderildi.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Yükleme başarısız oldu.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // NOT: documentsApi.remove backend'de artık akıllı davranıyor — bu belge
  // kendi yüklediğim bir belgeyse KALICI olarak siliniyor; yönetimin
  // benimle paylaştığı bir belgeyse sadece BENİM listemden kaldırılıyor
  // (diğer stajyerler/dosyanın kendisi etkilenmez). Bu yüzden hem "Kendi
  // Belgelerim" hem "Paylaşılan Belgeler" bölümünde aynı fonksiyon kullanılır.
  const handleDelete = async (doc: any) => {
    try {
      const r = await documentsApi.remove(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success(r.data?.message || 'Belge kaldırıldı.');
    } catch {
      toast.error('Belge kaldırılamadı.');
    }
  };

  // Kendi yüklediklerim vs. yönetimin benimle paylaştığı belgeler ayrı
  // gruplanır — sadece kendi yüklediğim belgeleri silebilirim.
  const myDocs = docs.filter(d => d.uploadedBy?.id === user?.id);
  const sharedDocs = docs.filter(d => d.uploadedBy?.id !== user?.id);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>📎 Belgelerim</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Staj defteri, rapor veya diğer belgelerinizi yükleyin — yöneticiniz anında görebilsin.
        </p>
      </div>

      {/* Yükleme alanı */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--primary)' : '#CBD5E1'}`,
          borderRadius: 12,
          padding: '32px 20px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: dragOver ? '#EFF6FF' : '#F8FAFC',
          marginBottom: 24,
          transition: 'all .2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
        />
        <div style={{ fontSize: 36, marginBottom: 8 }}>{uploading ? '⏳' : '📤'}</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          {uploading ? 'Yükleniyor…' : 'Belge yüklemek için tıklayın veya sürükleyip bırakın'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          PDF, Word, Excel, görsel veya ZIP — en fazla {MAX_SIZE_MB} MB
        </div>
      </div>

      {/* Yönetimden gelen paylaşılan belgeler */}
      {sharedDocs.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-secondary)' }}>
            🏢 YÖNETİMİN SİZİNLE PAYLAŞTIĞI BELGELER ({sharedDocs.length})
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            {sharedDocs.map((doc, idx) => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                borderBottom: idx < sharedDocs.length - 1 ? '1px solid var(--border)' : 'none',
                background: '#F0FDF4',
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{fileEmoji(doc.mimeType)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {fmtSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {doc.uploadedBy?.name && <> · {doc.uploadedBy.name} tarafından paylaşıldı</>}
                  </div>
                </div>
                <a href={fileUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: '7px 12px', borderRadius: 8, background: '#22C55E',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', flexShrink: 0,
                  }}>
                  İndir
                </a>
                <button onClick={() => handleDelete(doc)} title="Listemden kaldır"
                  style={{
                    border: 'none', background: '#FEF2F2', color: '#EF4444',
                    borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                  Sil
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Kendi yüklediğim belgeler */}
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-secondary)' }}>
        YÜKLEDİĞİM BELGELER ({myDocs.length})
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Yükleniyor…
        </div>
      ) : myDocs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
          Henüz belge yüklemediniz.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {myDocs.map((doc, idx) => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
              borderBottom: idx < myDocs.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{fileEmoji(doc.mimeType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {fmtSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString('tr-TR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <a href={fileUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '7px 12px', borderRadius: 8, background: '#EFF6FF',
                  color: '#2563EB', fontSize: 12, fontWeight: 700,
                  textDecoration: 'none', flexShrink: 0,
                }}>
                Görüntüle
              </a>
              <button onClick={() => handleDelete(doc)} title="Sil"
                style={{
                  border: 'none', background: '#FEF2F2', color: '#EF4444',
                  borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
