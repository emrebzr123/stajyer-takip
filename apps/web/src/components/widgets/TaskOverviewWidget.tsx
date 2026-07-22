'use client';
import React, { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import ProgressBar from '@/components/ui/ProgressBar';
import Pagination from '@/components/layout/Pagination';
import { formatDate, progressColor } from '@/lib/utils';
import api, { tasksApi, subtasksApi, personnelTasksApi } from '@/lib/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

type Mode = 'stajyer' | 'personel';

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
// Son tarihe göre en yakından en uzağa sıralar — son tarihi olmayan
// satırlar (örn. henüz hiç görevi olmayan bir proje) en sona atılır,
// çünkü aciliyeti yok.
function sortByDueDate(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
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

  const loadStajyer = () => {
    tasksApi.getAll({ limit: 200 }).then((r) => {
      const data = r.data?.data || r.data || [];
      setRows(sortByDueDate(data.map((t: any) => ({
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
      setRows(sortByDueDate(allBoards.map((b: any) => {
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

  // NOT: "Personel" modunda artık "Son Tarih" sütunu da var (board'un kendi
  // dueDate'i), bu yüzden colSpan her iki modda da aynı sayıda sütun
  // içeriyor — sadece "Öncelik" sütunu SADECE stajyer modunda var.
  const colSpan = mode === 'stajyer' ? 7 : 6;

  // Arama — görev/proje adı ya da stajyer/personel adında geçen metne göre.
  const filteredRows = search.trim()
    ? rows.filter((r) =>
        r.title.toLowerCase().includes(search.trim().toLowerCase())
        || r.subLabel.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : rows;

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
              <th>Son Tarih</th>
              <th>İlerleme</th>
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
    </div>
  );
}
