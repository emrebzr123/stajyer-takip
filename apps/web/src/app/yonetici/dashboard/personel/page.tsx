'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import api, { personnelTasksApi, companiesApi } from '@/lib/api';
import toast from 'react-hot-toast';

const PRIORITY_COLOR: Record<string, string> = {
  'Yüksek': '#EF4444', 'Orta': '#F59E0B', 'Düşük': '#22C55E',
};
// "Görevlerim" (kişisel bölüm/pano) sayfasıyla BİREBİR AYNI sınır — bir
// sayfada en fazla bu kadar bölüm gösterilir, fazlası sayfalanır.
const BOARDS_PER_PAGE = 4;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

// ─── Tek bir görev satırı ───────────────────────────────────────────────────
function TaskRow({ task, onDelete, selected, onToggleSelect }: {
  task: any; onDelete: () => void; selected: boolean; onToggleSelect: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px',
      borderRadius: 8, marginBottom: 6, background: '#fff', border: '1px solid var(--border)',
      opacity: task.isCompleted ? 0.6 : 1,
    }}>
      <input type="checkbox" checked={selected} onChange={onToggleSelect}
        style={{ width: 15, height: 15, marginTop: 2, cursor: 'pointer', accentColor: '#EF4444', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, wordBreak: 'break-word',
          textDecoration: task.isCompleted ? 'line-through' : 'none',
          color: task.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, color: PRIORITY_COLOR[task.priority], background: PRIORITY_COLOR[task.priority] + '18' }}>
            {task.priority}
          </span>
          {task.dueDate && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📅 {fmtDate(task.dueDate)}</span>}
        </div>
      </div>
      {confirmDelete ? (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={onDelete} style={{ border: 'none', background: '#EF4444', color: '#fff', borderRadius: 5, padding: '3px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Sil</button>
          <button onClick={() => setConfirmDelete(false)} style={{ border: 'none', background: '#F1F5F9', borderRadius: 5, padding: '3px 6px', fontSize: 10, cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} title="Görevi sil" style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', flexShrink: 0, padding: 2 }}>
          <Icon name="trash" size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Tek bir bölüm (sütun) ───────────────────────────────────────────────────
function BoardColumn({ board, onChanged, selected, onToggleSelect }: {
  board: any; onChanged: () => void; selected: boolean; onToggleSelect: () => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('Orta');
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(false);
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteTasks, setConfirmBulkDeleteTasks] = useState(false);

  const tasks: any[] = board.tasks || [];
  const active = tasks.filter((t) => !t.isCompleted);
  const completed = tasks.filter((t) => t.isCompleted);

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    try { await personnelTasksApi.removeTask(taskId); toast.success('Görev silindi.'); onChanged(); }
    catch { toast.error('Silinemedi.'); }
  };
  const handleBulkDeleteTasks = async () => {
    try {
      await Promise.all(Array.from(selectedTaskIds).map((id) => personnelTasksApi.removeTask(id)));
      toast.success(`${selectedTaskIds.size} görev silindi.`);
      setSelectedTaskIds(new Set()); setConfirmBulkDeleteTasks(false);
      onChanged();
    } catch { toast.error('Bazı görevler silinemedi.'); }
  };
  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await personnelTasksApi.createTask(board.id, { title: newTitle.trim(), priority: newPriority, dueDate: newDue || undefined });
      setNewTitle(''); setNewDue(''); setNewPriority('Orta'); setAdding(false);
      onChanged();
    } catch { toast.error('Görev eklenemedi.'); }
    finally { setSaving(false); }
  };
  const handleDeleteBoard = async () => {
    try { await personnelTasksApi.removeBoard(board.id); toast.success('Proje silindi.'); onChanged(); }
    catch { toast.error('Proje silinemedi.'); }
  };
  const handleClearCompleted = async () => {
    try {
      const r = await personnelTasksApi.clearCompleted(board.id);
      toast.success(r.data?.message || 'Tamamlananlar silindi.');
      setConfirmClearCompleted(false);
      onChanged();
    } catch { toast.error('Silinemedi.'); }
  };

  return (
    <div style={{
      minWidth: 270, maxWidth: 270, flexShrink: 0, background: '#F8FAFC',
      borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column',
      maxHeight: 460, border: selected ? '2px solid #1E3A5F' : '2px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: board.company ? 4 : 10, position: 'relative' }}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} title="Toplu silmek için seç"
          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1E3A5F', flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: board.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, wordBreak: 'break-word' }}>{board.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>{active.length}</span>
        <button onClick={() => setMenuOpen((o) => !o)} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
          <Icon name="more" size={15} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: 24, right: 0, zIndex: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: 170, overflow: 'hidden' }}>
            {!confirmDeleteBoard ? (
              <button onClick={() => setConfirmDeleteBoard(true)} style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>
                🗑 Projeyi Sil
              </button>
            ) : (
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 11, marginBottom: 6, color: 'var(--text-secondary)' }}>Proje ve içindeki tüm görevler silinecek.</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleDeleteBoard} style={{ flex: 1, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 6, padding: '5px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Evet, Sil</button>
                  <button onClick={() => { setConfirmDeleteBoard(false); setMenuOpen(false); }} style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer' }}>Vazgeç</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Şirket rozeti — proje bir şirkete bağlıysa gösterilir */}
      {board.company && (
        <div style={{ marginBottom: 10, marginLeft: 22 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            color: board.color, background: board.color + '18',
          }}>
            🏢 {board.company.name}
          </span>
        </div>
      )}

      {selectedTaskIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#B91C1C', flex: 1 }}>{selectedTaskIds.size} seçildi</span>
          {confirmBulkDeleteTasks ? (
            <>
              <button onClick={handleBulkDeleteTasks} style={{ fontSize: 10, fontWeight: 700, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}>Evet</button>
              <button onClick={() => setConfirmBulkDeleteTasks(false)} style={{ fontSize: 10, border: 'none', background: '#fff', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}>Vazgeç</button>
            </>
          ) : (
            <button onClick={() => setConfirmBulkDeleteTasks(true)} style={{ fontSize: 10, fontWeight: 700, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}>Sil</button>
          )}
        </div>
      )}

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {active.length === 0 && !adding && (
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 12, padding: '16px 0' }}>Görev yok</div>
        )}
        {active.map((t) => (
          <TaskRow key={t.id} task={t} onDelete={() => handleDeleteTask(t.id)} selected={selectedTaskIds.has(t.id)} onToggleSelect={() => toggleSelectTask(t.id)} />
        ))}

        {completed.length > 0 && (
          <div style={{ marginTop: active.length ? 8 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowCompleted((s) => !s)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 2px', fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="checkCircle" size={13} /> {completed.length} tamamlandı {showCompleted ? '▲' : '▼'}
              </button>
              {showCompleted && !confirmClearCompleted && (
                <button onClick={() => setConfirmClearCompleted(true)} style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: 10, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Tümünü Sil</button>
              )}
              {confirmClearCompleted && (
                <span style={{ display: 'flex', gap: 4 }}>
                  <button onClick={handleClearCompleted} style={{ border: 'none', background: '#EF4444', color: '#fff', borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Emin misin?</button>
                  <button onClick={() => setConfirmClearCompleted(false)} style={{ border: 'none', background: '#F1F5F9', borderRadius: 5, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>Vazgeç</button>
                </span>
              )}
            </div>
            {showCompleted && (
              <div style={{ marginTop: 4 }}>
                {completed.map((t) => (
                  <TaskRow key={t.id} task={t} onDelete={() => handleDeleteTask(t.id)} selected={selectedTaskIds.has(t.id)} onToggleSelect={() => toggleSelectTask(t.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {adding ? (
        <div style={{ marginTop: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Görev başlığı…" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', fontSize: 11 }}>
              <option>Yüksek</option><option>Orta</option><option>Düşük</option>
            </select>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAddTask} disabled={saving || !newTitle.trim()} style={{ flex: 1, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '…' : 'Ekle'}
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); }} style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '6px 0', fontSize: 12, cursor: 'pointer' }}>Vazgeç</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ marginTop: 8, border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left', padding: '6px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="plus" size={13} /> Görev Ekle
        </button>
      )}
    </div>
  );
}

// ─── Görev bölümleri paneli (seçili personel için) ──────────────────────────
function PersonelBoardsPanel({ personelId, personelName }: { personelId: string; personelName: string }) {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardCompanyId, setNewBoardCompanyId] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardPage, setBoardPage] = useState(0);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Şirkete göre filtreleme — "Tümü" + sistemde kayıtlı her şirket için
  // bir sekme. Mevcut CompanyEntity (stajyer ekleme formundaki "Firma"
  // alanıyla AYNI tablo) kullanılıyor, ayrı bir şirket sistemi kurulmadı.
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  useEffect(() => {
    companiesApi.getAll().then((r) => setCompanies(r.data || [])).catch(() => undefined);
  }, []);

  const load = () => {
    personnelTasksApi.getBoardsFor(personelId)
      .then((r) => setBoards(r.data || []))
      .catch(() => toast.error('Projeler yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setBoardPage(0);
    setSelectedBoardIds(new Set());
    setCompanyFilter('all');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personelId]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    setSavingBoard(true);
    try {
      await personnelTasksApi.createBoard(personelId, newBoardName.trim(), newBoardCompanyId || undefined);
      setNewBoardName(''); setNewBoardCompanyId(''); setAddingBoard(false);
      load();
    } catch { toast.error('Proje oluşturulamadı.'); }
    finally { setSavingBoard(false); }
  };

  const toggleSelectBoard = (id: string) => {
    setSelectedBoardIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBulkDeleteBoards = async () => {
    try {
      const r = await personnelTasksApi.removeBoards(Array.from(selectedBoardIds));
      toast.success(r.data?.message || 'Projeler silindi.');
      setSelectedBoardIds(new Set()); setConfirmBulkDelete(false);
      load();
    } catch { toast.error('Silinemedi.'); }
  };

  // Filtre uygulanmış liste — sayfalama bunun üzerinden hesaplanıyor
  const filteredBoards = companyFilter === 'all'
    ? boards
    : companyFilter === 'none'
      ? boards.filter((b) => !b.companyId)
      : boards.filter((b) => b.companyId === companyFilter);

  const totalPages = Math.max(1, Math.ceil(filteredBoards.length / BOARDS_PER_PAGE));
  const safePage = Math.min(boardPage, totalPages - 1);
  const pagedBoards = filteredBoards.slice(safePage * BOARDS_PER_PAGE, safePage * BOARDS_PER_PAGE + BOARDS_PER_PAGE);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{personelName} — Projeler</div>
        {addingBoard ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
              placeholder="Proje adı (örn. Yazılım Projesi)…" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, minWidth: 220 }} />
            {/* Şirket seçimi opsiyonel — boş bırakılırsa proje herhangi bir
                şirkete bağlı olmadan oluşturulur. */}
            <select value={newBoardCompanyId} onChange={(e) => setNewBoardCompanyId(e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              <option value="">Şirket seçin (opsiyonel)</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {companies.length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                Hiç şirket yok — önce <Link href="/yonetici/dashboard/sirketler" style={{ color: '#1E3A5F', fontWeight: 700 }}>Şirketler</Link> sayfasından ekleyin.
              </span>
            )}
            <button onClick={handleCreateBoard} disabled={savingBoard || !newBoardName.trim()} style={{ border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {savingBoard ? '…' : 'Oluştur'}
            </button>
            <button onClick={() => { setAddingBoard(false); setNewBoardName(''); setNewBoardCompanyId(''); }} style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>Vazgeç</button>
          </div>
        ) : (
          <button onClick={() => setAddingBoard(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Icon name="plus" size={15} /> Proje Ekle
          </button>
        )}
      </div>

      {/* Şirkete göre filtre sekmeleri — sadece birden fazla şirket VEYA
          en az bir proje bir şirkete bağlıysa gösterilir; aksi halde
          gereksiz bir kalabalık olur. */}
      {companies.length > 0 && boards.some((b) => b.companyId) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ id: 'all', name: 'Tümü' }, ...companies, { id: 'none', name: 'Şirketsiz' }].map((c) => {
            const active = companyFilter === c.id;
            return (
              <button key={c.id} onClick={() => { setCompanyFilter(c.id); setBoardPage(0); }}
                style={{
                  border: active ? '1.5px solid #1E3A5F' : '1px solid var(--border)',
                  background: active ? '#1E3A5F0F' : '#fff',
                  color: active ? '#1E3A5F' : 'var(--text-secondary)',
                  borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {selectedBoardIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>{selectedBoardIds.size} proje seçildi</span>
          {confirmBulkDelete ? (
            <>
              <button onClick={handleBulkDeleteBoards} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Evet, {selectedBoardIds.size} projeyi sil
              </button>
              <button onClick={() => setConfirmBulkDelete(false)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fff', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Vazgeç</button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmBulkDelete(true)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="trash" size={13} /> Seçilenleri Sil
              </button>
              <button onClick={() => setSelectedBoardIds(new Set())} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Seçimi Temizle</button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : boards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Henüz proje yok</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            "Proje Ekle" ile {personelName} için ilk projeyi oluşturun.
          </div>
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Bu filtreye uyan proje yok</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Farklı bir şirket seçin ya da "Tümü" sekmesine dönün.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {pagedBoards.map((b) => (
              <BoardColumn key={b.id} board={b} onChanged={load} selected={selectedBoardIds.has(b.id)} onToggleSelect={() => toggleSelectBoard(b.id)} />
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
              <button onClick={() => setBoardPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="page-btn" style={{ opacity: safePage === 0 ? 0.4 : 1 }}>
                <Icon name="chevronLeft" size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setBoardPage(i)} className={`page-btn${safePage === i ? ' active' : ''}`}>{i + 1}</button>
              ))}
              <button onClick={() => setBoardPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1} className="page-btn" style={{ opacity: safePage === totalPages - 1 ? 0.4 : 1 }}>
                <Icon name="chevronRight" size={16} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                {filteredBoards.length} projeden {safePage * BOARDS_PER_PAGE + 1}-{Math.min((safePage + 1) * BOARDS_PER_PAGE, filteredBoards.length)} arası gösteriliyor
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────
export default function PersonelPage() {
  const [personel, setPersonel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingPersonel, setAddingPersonel] = useState(false);
  const [newP, setNewP] = useState({ name: '', email: '', password: '' });
  const [savingP, setSavingP] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const loadPersonel = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users');
      setPersonel((r.data || []).filter((u: any) => u.role === 'manager' || u.role === 'admin'));
    } catch {
      toast.error('Personel listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPersonel(); }, []);

  const handleAddPersonel = async () => {
    if (!newP.name.trim() || !newP.email.trim() || !newP.password.trim()) {
      toast.error('Ad, e-posta ve şifre zorunludur.');
      return;
    }
    setSavingP(true);
    try {
      await api.post('/users', { name: newP.name.trim(), email: newP.email.trim(), password: newP.password, role: 'manager' });
      toast.success('Personel eklendi.');
      setNewP({ name: '', email: '', password: '' });
      setAddingPersonel(false);
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Personel eklenemedi.');
    } finally {
      setSavingP(false);
    }
  };

  const handleRoleChange = async (p: any, newRole: 'admin' | 'manager') => {
    setRoleChanging(p.id);
    try {
      await api.patch(`/users/${p.id}`, { role: newRole });
      toast.success(`${p.name} artık ${newRole === 'admin' ? 'Admin/Yönetici' : 'Personel'}.`);
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Rol değiştirilemedi.');
    } finally {
      setRoleChanging(null);
    }
  };

  const handleDeletePersonel = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('Personel silindi.');
      setConfirmDel(null);
      if (selectedId === id) setSelectedId(null);
      loadPersonel();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Silinemedi.');
    }
  };

  const selected = personel.find((p) => p.id === selectedId);

  return (
    <div>
      <PageHeader title="Personel" subtitle="Personel ekleyin, proje oluşturup görev atayın." />

      <div style={{ marginBottom: 16 }}>
        {addingPersonel ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 640 }}>
            <input placeholder="Ad Soyad" value={newP.name} onChange={(e) => setNewP((f) => ({ ...f, name: e.target.value }))}
              style={{ flex: 1, minWidth: 140, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <input placeholder="E-posta" value={newP.email} onChange={(e) => setNewP((f) => ({ ...f, email: e.target.value }))}
              style={{ flex: 1, minWidth: 160, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <input placeholder="Şifre" type="text" value={newP.password} onChange={(e) => setNewP((f) => ({ ...f, password: e.target.value }))}
              style={{ flex: 1, minWidth: 120, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <button onClick={handleAddPersonel} disabled={savingP}
              style={{ border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {savingP ? '…' : 'Ekle'}
            </button>
            <button onClick={() => setAddingPersonel(false)} style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>Vazgeç</button>
          </div>
        ) : (
          <button onClick={() => setAddingPersonel(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Icon name="plus" size={15} /> Personel Ekle
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : (
        <>
          {/* Personel listesi — tam genişlik, tıklayınca altta o kişinin
              projeleri açılır. */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>Personel</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}></th>
                </tr>
              </thead>
              <tbody>
                {personel.map((p) => {
                  const isSelected = selectedId === p.id;
                  return (
                    <tr key={p.id} onClick={() => setSelectedId(isSelected ? null : p.id)}
                      style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', background: isSelected ? '#EFF6FF' : undefined }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.email}</div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, marginTop: 3, display: 'inline-block',
                          color: p.role === 'admin' ? '#1E3A5F' : '#0F6E6E',
                          background: p.role === 'admin' ? '#1E3A5F14' : '#0F6E6E14',
                        }}>
                          {p.role === 'admin' ? 'Yönetici' : 'Personel'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleRoleChange(p, p.role === 'admin' ? 'manager' : 'admin')} disabled={roleChanging === p.id}
                            title={p.role === 'admin' ? 'Personel yap' : 'Yönetici yap'}
                            style={{ fontSize: 10, fontWeight: 600, padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}>
                            {roleChanging === p.id ? '…' : p.role === 'admin' ? 'Personel Yap' : 'Yönetici Yap'}
                          </button>
                          {confirmDel === p.id ? (
                            <>
                              <button onClick={() => handleDeletePersonel(p.id)} style={{ fontSize: 10, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 6, padding: '4px 7px', cursor: 'pointer' }}>Evet</button>
                              <button onClick={() => setConfirmDel(null)} style={{ fontSize: 10, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '4px 7px', cursor: 'pointer' }}>Vazgeç</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDel(p.id)} title="Sil" style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}>
                              <Icon name="trash" size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {personel.length === 0 && (
                  <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Henüz personel yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selected ? (
            <PersonelBoardsPanel key={selected.id} personelId={selected.id} personelName={selected.name} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '30px 0' }}>
              Proje oluşturmak için yukarıdan bir personel seçin.
            </div>
          )}
        </>
      )}
    </div>
  );
}
