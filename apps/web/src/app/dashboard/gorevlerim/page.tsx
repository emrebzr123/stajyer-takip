'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import StatCard from '@/components/ui/StatCard';
import { adminTasksApi, personnelTasksApi, companiesApi } from '@/lib/api';
import toast from 'react-hot-toast';

const PRIORITY_COLOR: Record<string, string> = {
  'Yüksek': '#EF4444', 'Orta': '#F59E0B', 'Düşük': '#22C55E',
};

// Bir sayfada gösterilecek bölüm (sütun) sayısı — bundan fazlası olduğunda
// yatay kaydırma yerine gerçek bir sayfalama kullanılır.
const BOARDS_PER_PAGE = 4;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}
// Oluşturulma tarihi için — yıl dahil (Yönetici panelindeki Görevler
// sayfasıyla aynı format).
function fmtDateWithYear(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isOverdue(t: any) {
  return !t.isCompleted && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10);
}

// ─── Tek bir görev satırı (hem Liste hem Tablo görünümünde kullanılır) ──────
function TaskRow({ task, onToggle, onDelete, showBoard }: {
  task: any; onToggle: () => void; onDelete: () => void; showBoard?: { name: string; color: string };
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overdue = isOverdue(task);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px',
      borderRadius: 8, marginBottom: 6, background: '#fff',
      border: '1px solid var(--border)', opacity: task.isCompleted ? 0.6 : 1,
    }}>
      <input type="checkbox" checked={task.isCompleted} onChange={onToggle}
        style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', accentColor: '#22C55E', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          textDecoration: task.isCompleted ? 'line-through' : 'none',
          color: task.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
          wordBreak: 'break-word',
        }}>
          {task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {showBoard && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
              color: showBoard.color, background: showBoard.color + '18',
            }}>
              {showBoard.name}
            </span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
            color: PRIORITY_COLOR[task.priority], background: PRIORITY_COLOR[task.priority] + '18',
          }}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span style={{ fontSize: 11, color: overdue ? '#EF4444' : 'var(--text-secondary)', fontWeight: overdue ? 700 : 400 }}>
              📅 {fmtDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      {confirmDelete ? (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={onDelete} title="Evet, sil"
            style={{ border: 'none', background: '#EF4444', color: '#fff', borderRadius: 5, padding: '3px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            Sil
          </button>
          <button onClick={() => setConfirmDelete(false)} title="Vazgeç"
            style={{ border: 'none', background: '#F1F5F9', borderRadius: 5, padding: '3px 6px', fontSize: 10, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} title="Görevi sil"
          style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', flexShrink: 0, padding: 2 }}>
          <Icon name="trash" size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Tek bir bölüm (sütun) — Liste görünümünde kullanılır ───────────────────
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

  const tasks: any[] = board.tasks || [];
  const active = tasks.filter((t) => !t.isCompleted);
  const completed = tasks.filter((t) => t.isCompleted);

  const handleToggle = async (task: any) => {
    try { await adminTasksApi.updateTask(task.id, { isCompleted: !task.isCompleted }); onChanged(); }
    catch { toast.error('Güncellenemedi.'); }
  };
  const handleDeleteTask = async (taskId: string) => {
    try { await adminTasksApi.removeTask(taskId); toast.success('Görev silindi.'); onChanged(); }
    catch { toast.error('Silinemedi.'); }
  };
  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await adminTasksApi.createTask(board.id, { title: newTitle.trim(), priority: newPriority, dueDate: newDue || undefined });
      setNewTitle(''); setNewDue(''); setNewPriority('Orta'); setAdding(false);
      onChanged();
    } catch { toast.error('Görev eklenemedi.'); }
    finally { setSaving(false); }
  };
  const handleDeleteBoard = async () => {
    try { await adminTasksApi.removeBoard(board.id); toast.success('Bölüm silindi.'); onChanged(); }
    catch { toast.error('Bölüm silinemedi.'); }
  };
  const handleClearCompleted = async () => {
    try {
      const r = await adminTasksApi.clearCompleted(board.id);
      toast.success(r.data?.message || 'Tamamlananlar silindi.');
      setConfirmClearCompleted(false);
      onChanged();
    } catch { toast.error('Silinemedi.'); }
  };

  return (
    <div style={{
      minWidth: 280, maxWidth: 280, flexShrink: 0, background: '#F8FAFC',
      borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 280px)',
      border: selected ? '2px solid var(--primary)' : '2px solid transparent',
    }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} title="Toplu silmek için seç"
          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: board.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, wordBreak: 'break-word' }}>{board.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
          {active.length}
        </span>
        <button onClick={() => setMenuOpen((o) => !o)}
          style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
          <Icon name="more" size={15} />
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', top: 24, right: 0, zIndex: 10,
            background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,.12)', minWidth: 170, overflow: 'hidden',
          }}>
            {!confirmDeleteBoard ? (
              <button onClick={() => setConfirmDeleteBoard(true)}
                style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>
                🗑 Bölümü Sil
              </button>
            ) : (
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 11, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  Bölüm ve içindeki tüm görevler silinecek. Emin misiniz?
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleDeleteBoard}
                    style={{ flex: 1, border: 'none', background: '#EF4444', color: '#fff', borderRadius: 6, padding: '5px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Evet, Sil
                  </button>
                  <button onClick={() => { setConfirmDeleteBoard(false); setMenuOpen(false); }}
                    style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer' }}>
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aktif görevler */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {active.length === 0 && !adding && (
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 12, padding: '16px 0' }}>Görev yok</div>
        )}
        {active.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={() => handleToggle(t)} onDelete={() => handleDeleteTask(t.id)} />
        ))}

        {completed.length > 0 && (
          <div style={{ marginTop: active.length ? 8 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showCompleted ? 6 : 0 }}>
              <button onClick={() => setShowCompleted((s) => !s)}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: '4px 2px',
                  fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Icon name="checkCircle" size={13} />
                {completed.length} tamamlandı {showCompleted ? '▲' : '▼'}
              </button>
              {/* "Tamamlanan görevleri sil" — bölüm başına toplu temizleme */}
              {showCompleted && !confirmClearCompleted && (
                <button onClick={() => setConfirmClearCompleted(true)}
                  style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: 10, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Tümünü Sil
                </button>
              )}
              {confirmClearCompleted && (
                <span style={{ display: 'flex', gap: 4 }}>
                  <button onClick={handleClearCompleted}
                    style={{ border: 'none', background: '#EF4444', color: '#fff', borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    Emin misin?
                  </button>
                  <button onClick={() => setConfirmClearCompleted(false)}
                    style={{ border: 'none', background: '#F1F5F9', borderRadius: 5, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>
                    Vazgeç
                  </button>
                </span>
              )}
            </div>
            {showCompleted && completed.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={() => handleToggle(t)} onDelete={() => handleDeleteTask(t.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Görev ekleme */}
      {adding ? (
        <div style={{ marginTop: 8, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} placeholder="Görev başlığı…"
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', fontSize: 11 }}>
              <option>Yüksek</option><option>Orta</option><option>Düşük</option>
            </select>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleAddTask} disabled={saving || !newTitle.trim()}
              style={{ flex: 1, border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? '…' : 'Ekle'}
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); }}
              style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '6px 0', fontSize: 12, cursor: 'pointer' }}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{
            marginTop: 8, border: 'none', background: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left', padding: '6px 4px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          <Icon name="plus" size={13} /> Görev Ekle
        </button>
      )}
    </div>
  );
}

// ─── Sayfa ───────────────────────────────────────────────────────────────────
// ─── Yöneticiden gelen bölüm — SALT OKUNUR (sadece tamamlama izni var) ─────
function ManagerBoardCard({ board, active, completed, onToggle }: {
  board: any; active: any[]; completed: any[]; onToggle: (t: any) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  // Yönetici panelindeki Görevler sayfasıyla AYNI özellik — başlığa
  // tıklayınca kart küçülüp sadece başlık satırı kalıyor, tekrar
  // tıklanınca eski hâline dönüyor.
  const [collapsed, setCollapsed] = useState(false);
  // Alt görevler en yakın bitiş tarihinden en uzağa doğru sıralanıyor —
  // bitiş tarihi olmayanlar en sona düşüyor (aciliyeti olmadığı için).
  const sortByDue = (list: any[]) => [...list].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  const sortedActive = sortByDue(active);
  const sortedCompleted = sortByDue(completed);
  return (
    <div style={{
      minWidth: 270, maxWidth: 270, flexShrink: 0, background: '#F8FAFC',
      borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', maxHeight: collapsed ? undefined : 400,
    }}>
      <div
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Genişletmek için tıklayın' : 'Küçültmek için tıklayın'}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer' }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: board.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, wordBreak: 'break-word' }}>{board.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>{active.length}</span>
        <Icon name="chevron" size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
      </div>
      {!collapsed && (
      <>
      {/* Şirket rozeti (varsa) + oluşturulma tarihi + bitiş tarihi (varsa)
          — Yönetici panelindeki Görevler sayfasıyla BİREBİR AYNI gösterim. */}
      <div style={{ marginBottom: 10, marginLeft: 18, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {board.company ? (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            color: board.color, background: board.color + '18',
          }}>
            🏢 {board.company.name}
          </span>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            color: board.color, background: board.color + '18',
          }}>
            ✅ Görev
          </span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          📅 Başlangıç: {fmtDateWithYear(board.createdAt)}
        </span>
        {board.dueDate && (
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            🏁 Bitiş: {fmtDateWithYear(board.dueDate)}
          </span>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {active.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 12, padding: '16px 0' }}>Devam eden görev yok. 🎉</div>
        ) : sortedActive.map((t) => (
          <label key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
            borderRadius: 8, marginBottom: 6, background: '#fff', border: '1px solid var(--border)', cursor: 'pointer',
          }}>
            <input type="checkbox" checked={false} onChange={() => onToggle(t)}
              style={{ width: 15, height: 15, marginTop: 2, cursor: 'pointer', accentColor: '#22C55E', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-word' }}>{t.title}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, color: PRIORITY_COLOR[t.priority], background: PRIORITY_COLOR[t.priority] + '18' }}>
                  {t.priority}
                </span>
                {t.createdAt && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📅 {fmtDate(t.createdAt)}</span>}
                {t.dueDate && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>🏁 {fmtDate(t.dueDate)}</span>}
              </div>
            </div>
          </label>
        ))}
        {completed.length > 0 && (
          <div style={{ marginTop: active.length ? 8 : 0 }}>
            <button onClick={() => setShowCompleted((s) => !s)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 2px', fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
              ✓ {completed.length} tamamlandı {showCompleted ? '▲' : '▼'}
            </button>
            {showCompleted && sortedCompleted.map((t) => (
              <label key={t.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                borderRadius: 8, marginTop: 6, background: '#fff', border: '1px solid var(--border)', cursor: 'pointer', opacity: 0.6,
              }}>
                <input type="checkbox" checked={true} onChange={() => onToggle(t)}
                  style={{ width: 15, height: 15, marginTop: 2, cursor: 'pointer', accentColor: '#22C55E', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, textDecoration: 'line-through', wordBreak: 'break-word' }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {t.createdAt && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📅 {fmtDate(t.createdAt)}</span>}
                    {t.dueDate && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>🏁 {fmtDate(t.dueDate)}</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

export default function GorevlerimPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);

  // Yönetici'nin bana (bu Personel'e) oluşturduğu görev BÖLÜMLERİ — kişisel
  // "Bölüm" panolarımdan TAMAMEN AYRI bir sistem, salt-okunur (bölüm/görev
  // ekleyip silemem, sadece içindeki görevleri tamamlandı işaretleyebilirim).
  // Tamamladığımda Yönetici'ye otomatik bildirim gider (backend tarafında).
  const [managerBoards, setManagerBoards] = useState<any[]>([]);
  const [managerBoardsLoading, setManagerBoardsLoading] = useState(true);
  const [managerBoardPage, setManagerBoardPage] = useState(0);

  // Şirkete göre filtreleme — Yönetici panelindeki Görevler sayfasıyla
  // AYNI mantık: "Tümü" + sistemde kayıtlı her şirket + "Görevler"
  // (şirketi olmayan, Yönetici'nin "Görev Ekle" ile oluşturduğu kayıtlar).
  const [companies, setCompanies] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  useEffect(() => {
    companiesApi.getAll().then((r) => setCompanies(r.data || [])).catch(() => undefined);
  }, []);

  const loadManagerBoards = () => {
    personnelTasksApi.getMyBoards()
      .then((r) => setManagerBoards(r.data || []))
      .catch(() => undefined)
      .finally(() => setManagerBoardsLoading(false));
  };

  const toggleManagerTask = async (task: any) => {
    try {
      await personnelTasksApi.updateTask(task.id, { isCompleted: !task.isCompleted });
      loadManagerBoards();
    } catch {
      toast.error('Güncellenemedi.');
    }
  };

  // Çok bölüm eklendiğinde yatay kaydırmak yerine gerçek bir sayfalama —
  // her sayfada BOARDS_PER_PAGE kadar bölüm gösterilir.
  const [boardPage, setBoardPage] = useState(0);

  // Toplu bölüm silme
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const load = () => {
    adminTasksApi.getBoards()
      .then((r) => setBoards(r.data || []))
      .catch(() => toast.error('Bölümler yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); loadManagerBoards(); }, []);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    setSavingBoard(true);
    try {
      await adminTasksApi.createBoard(newBoardName.trim());
      setNewBoardName(''); setAddingBoard(false);
      load();
    } catch { toast.error('Bölüm oluşturulamadı.'); }
    finally { setSavingBoard(false); }
  };

  const totalPages = Math.max(1, Math.ceil(boards.length / BOARDS_PER_PAGE));
  const safePage = Math.min(boardPage, totalPages - 1);
  const pagedBoards = boards.slice(safePage * BOARDS_PER_PAGE, safePage * BOARDS_PER_PAGE + BOARDS_PER_PAGE);

  const toggleSelectBoard = (id: string) => {
    setSelectedBoardIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDeleteBoards = async () => {
    try {
      const r = await adminTasksApi.removeBoards(Array.from(selectedBoardIds));
      toast.success(r.data?.message || 'Bölümler silindi.');
      setSelectedBoardIds(new Set());
      setConfirmBulkDelete(false);
      load();
    } catch { toast.error('Silinemedi.'); }
  };

  // Özet sayaçları — üstteki bilgi şeridi
  const allTasks = boards.flatMap((b) => b.tasks || []);
  const totalActive = allTasks.filter((t) => !t.isCompleted).length;
  const totalCompleted = allTasks.filter((t) => t.isCompleted).length;

  return (
    <div>
      <PageHeader
        title="Görevlerim"
        subtitle="Kişisel iş takibiniz — bu bölümleri ve görevleri sadece siz görebilirsiniz."
      />

      {/* Yöneticiden Gelen Projeler — kişisel "Bölüm" panolarımdan TAMAMEN
          AYRI, SALT-OKUNUR bir sistem: bölüm/görev ekleyip silemem, sadece
          içindeki görevleri tamamlandı işaretleyebilirim. "Görevlerim"
          (kişisel panolar) ile BİREBİR AYNI görünüm — 4 bölüm/sayfa. */}
      {!managerBoardsLoading && managerBoards.length > 0 && (() => {
        // Şirkete göre filtre uygulanmış liste — sayfalama bunun üzerinden.
        const filteredMBoards = companyFilter === 'all'
          ? managerBoards
          : companyFilter === 'none'
            ? managerBoards.filter((b: any) => !b.companyId)
            : managerBoards.filter((b: any) => b.companyId === companyFilter);

        const totalMPages = Math.max(1, Math.ceil(filteredMBoards.length / BOARDS_PER_PAGE));
        const safeMPage = Math.min(managerBoardPage, totalMPages - 1);
        const pagedMBoards = filteredMBoards.slice(safeMPage * BOARDS_PER_PAGE, safeMPage * BOARDS_PER_PAGE + BOARDS_PER_PAGE);
        return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              🏢 Yöneticiden Gelen Projeler
            </div>
            {/* Şirkete göre filtre sekmeleri — Yönetici panelindeki Görevler
                sayfasıyla aynı: Tümü / [şirketler] / Görevler (şirketsiz). */}
            {companies.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {[{ id: 'all', name: 'Tümü' }, ...companies, { id: 'none', name: 'Görevler' }].map((c) => {
                  const isActive = companyFilter === c.id;
                  return (
                    <button key={c.id} onClick={() => { setCompanyFilter(c.id); setManagerBoardPage(0); }}
                      style={{
                        border: isActive ? '1.5px solid #1E3A5F' : '1px solid var(--border)',
                        background: isActive ? '#1E3A5F0F' : '#fff',
                        color: isActive ? '#1E3A5F' : 'var(--text-secondary)',
                        borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            {filteredMBoards.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '12px 0' }}>Bu filtreye uyan proje yok.</div>
            ) : (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {pagedMBoards.map((b: any) => {
                const tasks: any[] = b.tasks || [];
                const active = tasks.filter((t) => !t.isCompleted);
                const completed = tasks.filter((t) => t.isCompleted);
                return (
                  <ManagerBoardCard key={b.id} board={b} active={active} completed={completed} onToggle={toggleManagerTask} />
                );
              })}
            </div>
            )}
            {totalMPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                <button onClick={() => setManagerBoardPage((p) => Math.max(0, p - 1))} disabled={safeMPage === 0} className="page-btn" style={{ opacity: safeMPage === 0 ? 0.4 : 1 }}>
                  <Icon name="chevronLeft" size={16} />
                </button>
                {Array.from({ length: totalMPages }, (_, i) => (
                  <button key={i} onClick={() => setManagerBoardPage(i)} className={`page-btn${safeMPage === i ? ' active' : ''}`}>{i + 1}</button>
                ))}
                <button onClick={() => setManagerBoardPage((p) => Math.min(totalMPages - 1, p + 1))} disabled={safeMPage === totalMPages - 1} className="page-btn" style={{ opacity: safeMPage === totalMPages - 1 ? 0.4 : 1 }}>
                  <Icon name="chevronRight" size={16} />
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  {filteredMBoards.length} bölümden {safeMPage * BOARDS_PER_PAGE + 1}-{Math.min((safeMPage + 1) * BOARDS_PER_PAGE, filteredMBoards.length)} arası gösteriliyor
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {!loading && boards.length > 0 && (
        <div className="stats-row stats-row-4 gorevlerim-stats">
          <StatCard label="Bölüm" value={boards.length} icon="clipboard" color="blue" sub="Toplam bölüm" small />
          <StatCard label="Aktif Görev" value={totalActive} icon="clock" color="orange" sub="Devam eden" small />
          <StatCard label="Tamamlanan" value={totalCompleted} icon="check" color="green" sub="Bitmiş görev" small />
          <StatCard label="Toplam" value={allTasks.length} icon="bar-chart" color="purple" sub="Tüm görevler" small />
        </div>
      )}

      {/* Bölüm Ekle */}
      <div style={{ marginBottom: 16 }}>
        {addingBoard ? (
          <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
            <input autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()} placeholder="Bölüm adı (örn. Yazılım Geliştirme)…"
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <button onClick={handleCreateBoard} disabled={savingBoard || !newBoardName.trim()}
              style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {savingBoard ? '…' : 'Oluştur'}
            </button>
            <button onClick={() => { setAddingBoard(false); setNewBoardName(''); }}
              style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>
              Vazgeç
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingBoard(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, border: 'none',
              background: 'var(--primary)', color: '#fff', borderRadius: 8,
              padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
            <Icon name="plus" size={15} /> Bölüm Ekle
          </button>
        )}
      </div>

      {/* Toplu bölüm silme çubuğu — bölüm seçildiğinde görünür */}
      {selectedBoardIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          padding: '10px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>
            {selectedBoardIds.size} bölüm seçildi
          </span>
          {confirmBulkDelete ? (
            <>
              <button onClick={handleBulkDeleteBoards}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Evet, {selectedBoardIds.size} bölümü sil
              </button>
              <button onClick={() => setConfirmBulkDelete(false)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fff', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Vazgeç
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmBulkDelete(true)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="trash" size={13} /> Seçilenleri Sil
              </button>
              <button onClick={() => setSelectedBoardIds(new Set())}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Seçimi Temizle
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
      ) : boards.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🗂️</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Henüz bölüm yok</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Üstteki "Bölüm Ekle" ile ilk kişisel iş takip bölümünüzü oluşturun.
          </div>
        </div>
      ) : (
        <>
          {/* NOT: Önceden bölümler tek satırda yatay kaydırma ile
              gösteriliyordu — çok bölüm eklenince sürekli sağa kaydırmak
              gerekiyordu. Artık sabit BOARDS_PER_PAGE kadar bölüm gösterilip
              altta gerçek bir sayfalama var. */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {pagedBoards.map((b) => (
              <BoardColumn
                key={b.id}
                board={b}
                onChanged={load}
                selected={selectedBoardIds.has(b.id)}
                onToggleSelect={() => toggleSelectBoard(b.id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
              <button onClick={() => setBoardPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                className="page-btn" style={{ opacity: safePage === 0 ? 0.4 : 1 }}>
                <Icon name="chevronLeft" size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setBoardPage(i)}
                  className={`page-btn${safePage === i ? ' active' : ''}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setBoardPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1}
                className="page-btn" style={{ opacity: safePage === totalPages - 1 ? 0.4 : 1 }}>
                <Icon name="chevronRight" size={16} />
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                {boards.length} bölümden {safePage * BOARDS_PER_PAGE + 1}-{Math.min((safePage + 1) * BOARDS_PER_PAGE, boards.length)} arası gösteriliyor
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
