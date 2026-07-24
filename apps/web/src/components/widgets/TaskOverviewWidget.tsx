'use client';
import React, { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import ProgressBar from '@/components/ui/ProgressBar';
import Pagination from '@/components/layout/Pagination';
import TaskModal from '@/components/modals/TaskModal';
import { formatDate, progressColor } from '@/lib/utils';
import api, { tasksApi, subtasksApi, personnelTasksApi } from '@/lib/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

type Mode = 'stajyer' | 'personel';
type DueSort = 'asc' | 'desc' | null;

// Ortak satır şekli — hem stajyer görevini hem personel projesini/görevini
// AYNI tabloda gösterebilmek için ikisini de bu ortak forma çeviriyoruz.
interface Row {
  id: string;
  title: string;
  subLabel: string;       // Stajyer adı ya da Personel adı
  extra: string;          // Bölüm ya da Şirket
  priority?: string;      // Sadece stajyer modunda var
  status: string;
  dueDate?: string;       // Her iki modda da var — personel modunda artık
                          // board'un KENDİ bitiş tarihi kullanılıyor.
  createdAt: string;
  progress: number;
  isOverdue?: boolean;
  items: any[];           // Genişletince gösterilen checklist (subtasks ya da board item'ları)
  raw: any;                // Ham veri — Düzenle penceresini doldurmak için
                            // (stajyer modunda doğrudan TaskModal'a geçiliyor).
}

// Genişletilmiş satır — SADECE alt görevler/checklist gösteriliyor. İş Takip
// Listesi'ndeki "Yorumlar" bölümü BİLEREK eklenmedi (Yönetici panelinde
// istenmedi).
function DetailRow({ mode, row, colSpan, onToggled }: {
  mode: Mode; row: Row; colSpan: number; onToggled: (itemId: string, val: boolean) => void;
}) {
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (item: any) => {
    setToggling(item.id);
    try {
      if (mode === 'stajyer') {
        await subtasksApi.toggle(item.id, !item.isCompleted);
      } else {
        await personnelTasksApi.updateTask(item.id, { isCompleted: !item.isCompleted });
      }
      onToggled(item.id, !item.isCompleted);
    } catch {
      toast.error('Güncellenemedi.');
    } finally { setToggling(null); }
  };

  return (
    <tr>
      <td colSpan={colSpan} style={{ background: '#F8FAFC', padding: '14px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
          {mode === 'stajyer' ? 'Alt Görevler' : 'Proje İçindeki Görevler'} ({row.items.filter((s) => s.isCompleted).length}/{row.items.length})
        </div>
        {row.items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {mode === 'stajyer' ? 'Bu görevde alt görev (checklist) yok.' : 'Bu projede henüz görev yok.'}
          </div>
        ) : row.items.map((s: any) => (
          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', opacity: toggling === s.id ? .6 : 1 }}>
            <input type="checkbox" checked={s.isCompleted} disabled={toggling === s.id}
              onChange={() => handleToggle(s)}
              style={{ width: 15, height: 15, accentColor: '#22C55E', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, textDecoration: s.isCompleted ? 'line-through' : 'none', color: s.isCompleted ? 'var(--text-secondary)' : 'inherit' }}>
              {s.title}
            </span>
          </label>
        ))}
      </td>
    </tr>
  );
}

// Yönetici Ana Sayfa'daki "İş Takip Listesi" widget'ı — üstte Personel/
// Stajyer filtresi, altta İş Takip Listesi ile AYNI mantıkla (satıra
// tıklayınca alt görevler açılıyor) ama YORUM BÖLÜMÜ OLMADAN bir tablo.
// "Stajyer" modu: gerçek stajyer görevleri (TaskEntity + Subtask).
// "Personel" modu: Yönetici'nin Görevler sayfasından oluşturduğu proje/
// görevler (PersonnelTaskBoard + PersonnelTaskItem) — burada "alt görev"
// olarak o projenin İÇİNDEKİ görevler gösteriliyor.
// En son eklenen görev/proje en üstte olacak şekilde sıralar (oluşturulma
// tarihine göre azalan). NOT: Önceden burada bitiş tarihine göre sıralama
// vardı — çoğu görevin bitiş tarihi ya boş ya da birbirine yakın olduğu
// için liste "rastgele" gibi görünüyordu. Personel panelindeki İş Takip
// Listesi'yle (en yeni üstte) tutarlı olması için değiştirildi.
function sortByNewest(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default function TaskOverviewWidget() {
  const [mode, setMode] = useState<Mode>('stajyer');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Arama — görev/proje adına ya da stajyer/personel adına göre filtreler.
  const [search, setSearch] = useState('');
  // Sayfalama — kendi içinde kaydırmak yerine artık 10'ar 10'ar sayfa
  // sayfa ilerleniyor.
  const [page, setPage] = useState(1);
  // Son Tarih sütununa tıklayınca en eskiden en yeniye / en yeniden en
  // eskiye doğru sıralama — null iken varsayılan (en son eklenen üstte).
  const [dueSort, setDueSort] = useState<DueSort>(null);
  // Düzenleme/silme — stajyer modunda gerçek TaskModal'ı (İş Takip
  // Listesi'yle AYNI bileşen) açıyoruz, böylece iki yer arasında hiçbir
  // sapma olmuyor (aynı API çağrıları, aynı validasyon).
  const [editingStajyerTask, setEditingStajyerTask] = useState<any | null>(null);
  // Personel modunda ise küçük bir inline düzenleme (isim + bitiş tarihi).
  const [editingPersonelRow, setEditingPersonelRow] = useState<Row | null>(null);
  const [editName, setEditName] = useState('');
  const [editDue, setEditDue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRow, setDeletingRow] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadStajyer = () => {
    tasksApi.getAll({ limit: 200 }).then((r) => {
      const data = r.data?.data || r.data || [];
      setRows(sortByNewest(data.map((t: any) => ({
        id: t.id,
        title: t.title,
        subLabel: t.intern?.user?.name || '-',
        extra: t.department?.name || t.intern?.department?.name || '-',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        progress: t.progress || 0,
        isOverdue: t.isOverdue,
        items: t.subtasks || [],
        raw: t,
      }))));
    }).catch(() => toast.error('Stajyer görevleri yüklenemedi.')).finally(() => setLoading(false));
  };

  const loadPersonel = async () => {
    try {
      const usersRes = await api.get('/users');
      const personel = (usersRes.data || []).filter((u: any) => u.role === 'manager' || u.role === 'admin');
      const boardsPerPersonel = await Promise.all(
        personel.map((p: any) =>
          personnelTasksApi.getBoardsFor(p.id)
            .then((r) => (r.data || []).map((b: any) => ({ ...b, personelName: p.name })))
            .catch(() => []),
        ),
      );
      const allBoards = boardsPerPersonel.flat();
      setRows(sortByNewest(allBoards.map((b: any) => {
        const items = b.tasks || [];
        const completed = items.filter((t: any) => t.isCompleted).length;
        return {
          id: b.id,
          title: b.name,
          subLabel: b.personelName,
          // NOT: Önceden "Şirketsiz" yazıyordu — artık sistemdeki genel
          // isimlendirmeyle tutarlı olsun diye "Görev" yazıyor (şirketi
          // olmayan bölümler zaten "Görev Ekle" ile oluşturuluyor).
          extra: b.company?.name || 'Görev',
          status: items.length > 0 && completed === items.length ? 'Tamamlandı' : 'Devam Ediyor',
          // NOT: Önceden burada içindeki görevlerin en yakın tarihi
          // hesaplanıyordu (board'un kendi tarihi henüz yoktu). Artık
          // board'un KENDİ bitiş tarihi (dueDate) var, doğrudan onu
          // kullanıyoruz.
          dueDate: b.dueDate,
          createdAt: b.createdAt,
          progress: items.length ? Math.round((completed / items.length) * 100) : 0,
          items,
          raw: b,
        };
      })));
    } catch {
      toast.error('Personel projeleri yüklenemedi.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    setExpandedId(null);
    setPage(1);
    setSearch('');
    if (mode === 'stajyer') loadStajyer(); else loadPersonel();
  }, [mode]);

  const handleToggled = (rowId: string, itemId: string, val: boolean) => {
    setRows((prev) => prev.map((r) => r.id === rowId
      ? { ...r, items: r.items.map((i: any) => i.id === itemId ? { ...i, isCompleted: val } : i) }
      : r));
  };

  const refresh = () => { if (mode === 'stajyer') loadStajyer(); else loadPersonel(); };

  // Silme — mod'a göre doğru API'yi (aynı İş Takip Listesi / Görevler
  // sayfasının kullandığı) çağırıyoruz, senkronizasyon garantili.
  const handleConfirmDelete = async () => {
    if (!deletingRow) return;
    setDeleting(true);
    try {
      if (mode === 'stajyer') await tasksApi.remove(deletingRow.id);
      else await personnelTasksApi.removeBoard(deletingRow.id);
      toast.success('Silindi.');
      setDeletingRow(null);
      refresh();
    } catch { toast.error('Silinemedi.'); }
    finally { setDeleting(false); }
  };

  // Personel modunda düzenleme — Görevler sayfasındaki BoardColumn'un
  // düzenleme formuyla AYNI (isim + bitiş tarihi), aynı API çağrısı.
  const openPersonelEdit = (row: Row) => {
    setEditingPersonelRow(row);
    setEditName(row.title);
    setEditDue(row.dueDate || '');
    setOpenMenuId(null);
  };
  const handleSavePersonelEdit = async () => {
    if (!editingPersonelRow || !editName.trim()) { toast.error('İsim boş olamaz.'); return; }
    setSavingEdit(true);
    try {
      await personnelTasksApi.updateBoard(editingPersonelRow.id, { name: editName.trim(), dueDate: editDue || undefined });
      toast.success('Güncellendi.');
      setEditingPersonelRow(null);
      refresh();
    } catch { toast.error('Güncellenemedi.'); }
    finally { setSavingEdit(false); }
  };

  // NOT: "Personel" modunda artık "Son Tarih" sütunu da var (board'un kendi
  // dueDate'i), bu yüzden colSpan her iki modda da aynı sayıda sütun
  // içeriyor — sadece "Öncelik" sütunu SADECE stajyer modunda var.
  const colSpan = (mode === 'stajyer' ? 7 : 6) + 1;

  // Arama — görev/proje adı ya da stajyer/personel adında geçen metne göre.
  const filteredRows0 = search.trim()
    ? rows.filter((r) =>
        r.title.toLowerCase().includes(search.trim().toLowerCase())
        || r.subLabel.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : rows;

  // Son Tarih sütununa tıklanınca en eski→en yeni / en yeni→en eski sıralama
  // devreye giriyor (tarihi olmayanlar her zaman en sona). dueSort null ise
  // varsayılan sıra (en son eklenen üstte, sortByNewest'ten geliyor) korunur.
  const filteredRows = dueSort
    ? [...filteredRows0].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return dueSort === 'asc' ? diff : -diff;
      })
    : filteredRows0;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <span className="card-title">İş Takip Listesi</span>
          {/* Personel / Stajyer filtresi — aynı widget içinde veri
              kaynağını ve sütunları değiştiriyor. */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setMode('stajyer')} style={{
              border: mode === 'stajyer' ? '1.5px solid #1E3A5F' : '1px solid var(--border)',
              background: mode === 'stajyer' ? '#1E3A5F0F' : '#fff',
              color: mode === 'stajyer' ? '#1E3A5F' : 'var(--text-secondary)',
              borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              Stajyer
            </button>
            <button onClick={() => setMode('personel')} style={{
              border: mode === 'personel' ? '1.5px solid #1E3A5F' : '1px solid var(--border)',
              background: mode === 'personel' ? '#1E3A5F0F' : '#fff',
              color: mode === 'personel' ? '#1E3A5F' : 'var(--text-secondary)',
              borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              Personel
            </button>
          </div>
        </div>
        {/* Arama — görev/proje adına ya da stajyer/personel adına göre. */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={mode === 'stajyer' ? 'Görev veya stajyer adına göre ara…' : 'Proje/görev veya personel adına göre ara…'}
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13 }}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{mode === 'stajyer' ? 'Görev' : 'Proje / Görev'}</th>
              <th>{mode === 'stajyer' ? 'Stajyer' : 'Personel'}</th>
              <th>{mode === 'stajyer' ? 'Bölüm' : 'Şirket'}</th>
              {mode === 'stajyer' && <th>Öncelik</th>}
              <th>Durum</th>
              <th onClick={() => setDueSort((s) => s === null ? 'asc' : s === 'asc' ? 'desc' : null)}
                style={{ cursor: 'pointer', userSelect: 'none' }} title="En eskiden yeniye / en yeniden eskiye sıralamak için tıklayın">
                Son Tarih {dueSort === 'asc' ? '▲' : dueSort === 'desc' ? '▼' : ''}
              </th>
              <th>İlerleme</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                {search.trim()
                  ? 'Aramanızla eşleşen bir kayıt bulunamadı.'
                  : mode === 'stajyer' ? 'Stajyer görevi bulunamadı.' : 'Personel projesi/görevi bulunamadı.'}
              </td></tr>
            ) : (
              pagedRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    style={{ cursor: 'pointer', background: expandedId === row.id ? '#F8FAFC' : undefined }}>
                    <td>
                      <div className="task-cell">
                        <div className="title">
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginRight: 6 }}>
                            {expandedId === row.id ? '▼' : '▶'}
                          </span>
                          {row.title}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="intern-cell">
                        <Avatar name={row.subLabel} size="sm" />
                        <span style={{ fontWeight: 500 }}>{row.subLabel}</span>
                      </div>
                    </td>
                    <td>{row.extra}</td>
                    {mode === 'stajyer' && <td><Badge text={row.priority || '-'} /></td>}
                    <td><Badge text={row.status} /></td>
                    <td className={row.isOverdue ? 'text-red' : ''}>{row.dueDate ? formatDate(row.dueDate) : '-'}</td>
                    <td>
                      <div className="table-progress">
                        <ProgressBar value={row.progress} color={progressColor(row.status)} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{row.progress}%</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                      <button onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                        style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>
                        <Icon name="more" size={15} />
                      </button>
                      {openMenuId === row.id && (
                        <div style={{
                          position: 'absolute', top: 28, right: 8, zIndex: 10, background: '#fff',
                          border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
                          minWidth: 140, overflow: 'hidden',
                        }}>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              if (mode === 'stajyer') setEditingStajyerTask(row.raw);
                              else openPersonelEdit(row);
                            }}
                            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                            ✏️ Düzenle
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); setDeletingRow(row); }}
                            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}>
                            🗑 Sil
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === row.id && (
                    <DetailRow mode={mode} row={row} colSpan={colSpan} onToggled={(itemId, val) => handleToggled(row.id, itemId, val)} />
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredRows.length > 0 && (
        <Pagination
          total={filteredRows.length}
          label={mode === 'stajyer' ? 'görev' : 'proje/görev'}
          page={safePage}
          totalPages={totalPages}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Stajyer düzenleme — İş Takip Listesi'ndeki İLE AYNI TaskModal
          bileşeni kullanılıyor, böylece iki yer arasında hiçbir sapma
          olmuyor: aynı form, aynı validasyon, aynı API. */}
      <TaskModal
        open={!!editingStajyerTask}
        task={editingStajyerTask}
        onClose={() => setEditingStajyerTask(null)}
        onSuccess={() => { setEditingStajyerTask(null); refresh(); }}
      />

      {/* Personel modu düzenleme — proje/görev adı + bitiş tarihi, Görevler
          sayfasındaki BoardColumn'un düzenleme formuyla AYNI mantık. */}
      {editingPersonelRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditingPersonelRow(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 340, maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Proje/Görevi Düzenle</div>
            <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
              placeholder="İsim…" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 8 }} />
            <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSavePersonelEdit} disabled={savingEdit || !editName.trim()}
                style={{ flex: 1, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {savingEdit ? '…' : 'Kaydet'}
              </button>
              <button onClick={() => setEditingPersonelRow(null)}
                style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '9px 0', fontSize: 13, cursor: 'pointer' }}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı — her iki mod için ortak. */}
      {deletingRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeletingRow(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 340, maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Silinsin mi?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              "{deletingRow.title}" {mode === 'stajyer' ? 'görevi' : 've içindeki tüm görevler'} kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleConfirmDelete} disabled={deleting}
                style={{ flex: 1, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {deleting ? '…' : 'Evet, Sil'}
              </button>
              <button onClick={() => setDeletingRow(null)}
                style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '9px 0', fontSize: 13, cursor: 'pointer' }}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
