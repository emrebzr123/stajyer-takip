'use client';
import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Icon from '@/components/ui/Icon';
import StatCard from '@/components/ui/StatCard';
import { adminTasksApi, personnelTasksApi, companiesApi, internsApi, tasksApi } from '@/lib/api';
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
function TaskRow({ task, onToggle, onDelete, onChanged, showBoard, orderNumber }: {
  task: any; onToggle: () => void; onDelete: () => void; onChanged?: () => void; showBoard?: { name: string; color: string }; orderNumber?: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overdue = isOverdue(task);
  // Görevi (başlık + öncelik + bitiş tarihi) sonradan düzenleyebilmek için
  // — Yönetici panelindeki Görevler sayfasındaki aynı özellik.
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority || 'Orta');
  const [editDue, setEditDue] = useState(task.dueDate || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { toast.error('Başlık boş olamaz.'); return; }
    setSavingEdit(true);
    try {
      await adminTasksApi.updateTask(task.id, { title: editTitle.trim(), priority: editPriority, dueDate: editDue || undefined });
      toast.success('Görev güncellendi.');
      setEditing(false);
      onChanged?.();
    } catch { toast.error('Güncellenemedi.'); }
    finally { setSavingEdit(false); }
  };

  if (editing) {
    return (
      <div style={{ padding: '9px 10px', borderRadius: 8, marginBottom: 6, background: '#fff', border: '1px solid var(--primary)' }}>
        <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', fontSize: 12, marginBottom: 6 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', fontSize: 11 }}>
            <option>Yüksek</option><option>Orta</option><option>Düşük</option>
          </select>
          <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', fontSize: 11 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} style={{ flex: 1, border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '5px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {savingEdit ? '…' : 'Kaydet'}
          </button>
          <button onClick={() => { setEditing(false); setEditTitle(task.title); setEditPriority(task.priority || 'Orta'); setEditDue(task.dueDate || ''); }} style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer' }}>
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px',
      borderRadius: 8, marginBottom: 6, background: '#fff',
      border: '1px solid var(--border)', opacity: task.isCompleted ? 0.6 : 1,
    }}>
      {orderNumber !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', background: '#F1F5F9',
          borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, marginTop: 1,
        }}>
          {orderNumber}
        </span>
      )}
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
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} title="Görevi düzenle" style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 2 }}>
            <Icon name="edit" size={13} />
          </button>
          <button onClick={() => setConfirmDelete(true)} title="Görevi sil"
            style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 2 }}>
            <Icon name="trash" size={13} />
          </button>
        </div>
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
  // Bölüm (proje/görev) düzenleme — isim ve bitiş tarihi sonradan
  // değiştirilebilsin diye. Yönetici'nin Görevler sayfasındaki aynı özellik.
  const [editingBoard, setEditingBoard] = useState(false);
  const [editName, setEditName] = useState(board.name);
  const [editDue, setEditDue] = useState(board.dueDate || '');
  const [savingBoardEdit, setSavingBoardEdit] = useState(false);

  const handleUpdateBoard = async () => {
    if (!editName.trim()) { toast.error('İsim boş olamaz.'); return; }
    setSavingBoardEdit(true);
    try {
      await adminTasksApi.updateBoard(board.id, { name: editName.trim(), dueDate: editDue || undefined });
      toast.success('Güncellendi.');
      setEditingBoard(false); setMenuOpen(false);
      onChanged();
    } catch { toast.error('Güncellenemedi.'); }
    finally { setSavingBoardEdit(false); }
  };

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
              <>
                <button onClick={() => { setEditingBoard(true); setMenuOpen(false); }}
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                  ✏️ Düzenle
                </button>
                <button onClick={() => setConfirmDeleteBoard(true)}
                  style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 600 }}>
                  🗑 Bölümü Sil
                </button>
              </>
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

      {editingBoard && (
        <div style={{ marginBottom: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
          <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
            placeholder="İsim…" style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginBottom: 6 }} />
          <input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleUpdateBoard} disabled={savingBoardEdit || !editName.trim()}
              style={{ flex: 1, border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {savingBoardEdit ? '…' : 'Kaydet'}
            </button>
            <button onClick={() => { setEditingBoard(false); setEditName(board.name); setEditDue(board.dueDate || ''); }}
              style={{ flex: 1, border: 'none', background: '#F1F5F9', borderRadius: 6, padding: '6px 0', fontSize: 12, cursor: 'pointer' }}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* Bitiş tarihi (varsa) — Yönetici panelindeki Görevler sayfasıyla
          aynı gösterim. */}
      {board.dueDate && (
        <div style={{ marginBottom: 10, marginLeft: 22, fontSize: 10, color: 'var(--text-secondary)' }}>
          🏁 Bitiş: {new Date(board.dueDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      )}

      {/* Aktif görevler */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {active.length === 0 && !adding && (
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 12, padding: '16px 0' }}>Görev yok</div>
        )}
        {active.map((t, index) => (
          <TaskRow key={t.id} task={t} onToggle={() => handleToggle(t)} onDelete={() => handleDeleteTask(t.id)} onChanged={onChanged} orderNumber={index + 1} />
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
            {showCompleted && completed.map((t, index) => (
              <TaskRow key={t.id} task={t} onToggle={() => handleToggle(t)} onDelete={() => handleDeleteTask(t.id)} onChanged={onChanged} orderNumber={active.length + index + 1} />
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
  // "Görev Aktar" — proje/görev adının yanındaki "⋮" menüsünden açılıyor.
  // Görev adını kendiniz yazıyorsunuz, bir stajyer + bitiş tarihi
  // seçiyorsunuz; onaylayınca bu projedeki/görevdeki TÜM alt görevler
  // (tamamlanmış olanlar dahil, mevcut durumlarıyla) o stajyere tek bir
  // yeni görev olarak, checklist'i içinde aktarılıyor.
  const [menuOpen, setMenuOpen] = useState(false);
  const [interns, setInterns] = useState<any[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTitle, setTransferTitle] = useState('');
  const [transferInternId, setTransferInternId] = useState('');
  const [transferDue, setTransferDue] = useState('');
  const [transferring, setTransferring] = useState(false);

  const openTransfer = () => {
    setShowTransfer(true);
    setMenuOpen(false);
    // Görev adı için makul bir başlangıç değeri — proje/görev adı; kullanıcı
    // isterse değiştirebilir.
    setTransferTitle(board.name);
    setTransferInternId('');
    setTransferDue('');
    if (interns.length === 0) {
      internsApi.getAll({ limit: 500 }).then((r) => setInterns(r.data?.data || [])).catch(() => undefined);
    }
  };

  const handleTransfer = async () => {
    if (!transferTitle.trim()) { toast.error('Görev adı girmelisiniz.'); return; }
    if (!transferInternId) { toast.error('Bir stajyer seçmelisiniz.'); return; }
    if (!transferDue) { toast.error('Bitiş tarihi girmelisiniz.'); return; }
    setTransferring(true);
    try {
      // Bu projedeki/görevdeki TÜM alt görevler (aktif + tamamlanmış),
      // yeni görevin checklist'i (subtasks) olarak aktarılıyor. Her birine
      // sourcePersonnelTaskItemId ekleniyor ki hangi taraftan işaretlenirse
      // işaretlensin (stajyer ya da siz), ikisi çift yönlü senkron kalsın.
      // NOT: Sadece HENÜZ TAMAMLANMAMIŞ (active) görevler aktarılıyor —
      // tamamlanmış bir görevi birine "yap" diye atamak zaten anlamsız.
      // Kaynak taraftaki tamamlanmış görevlere hiç dokunulmuyor, sadece
      // aktarma listesine dahil edilmiyorlar.
      const allItems = active;
      await tasksApi.create({
        title: transferTitle.trim(),
        internId: transferInternId,
        priority: 'Orta',
        dueDate: transferDue,
        subtasks: allItems.map((t: any) => ({
          title: t.title,
          isCompleted: t.isCompleted,
          sourcePersonnelTaskItemId: t.id,
        })),
      });
      toast.success('Görev stajyere aktarıldı.');
      setShowTransfer(false);
    } catch { toast.error('Aktarılamadı.'); }
    finally { setTransferring(false); }
  };
  return (
    <div style={{
      minWidth: 270, maxWidth: 270, flexShrink: 0, background: '#F8FAFC',
      borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', maxHeight: collapsed ? undefined : 400,
    }}>
      <div
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Genişletmek için tıklayın' : 'Küçültmek için tıklayın'}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer', position: 'relative' }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: board.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, wordBreak: 'break-word' }}>{board.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>{active.length}</span>
        <Icon name="chevron" size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .15s' }} />
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
          <Icon name="more" size={15} />
        </button>
        {menuOpen && (
          <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', top: 24, right: 0, zIndex: 10, background: '#fff',
            border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            minWidth: 150, overflow: 'hidden',
          }}>
            <button onClick={openTransfer} disabled={active.length === 0}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: active.length === 0 ? '#CBD5E1' : 'var(--text-primary)', cursor: active.length === 0 ? 'default' : 'pointer' }}>
              Görev Aktar
            </button>
          </div>
        )}
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

      {/* Görev Aktar — proje/görev adının yanındaki "⋮" menüsünden açılır.
          Görev adını yazıp, bir stajyer + bitiş tarihi seçtiğinizde, bu
          projedeki/görevdeki TÜM alt görevler o stajyere tek bir yeni
          görevin checklist'i olarak aktarılır. */}
      {showTransfer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowTransfer(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, width: 380, maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Görev Aktar</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
              "{board.name}" içindeki henüz tamamlanmamış {active.length} görev, seçtiğiniz stajyere yeni bir görev olarak aktarılacak. Tamamlanmış görevler bu aktarıma dahil edilmez.
            </div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Görev adı</label>
            <input value={transferTitle} onChange={(e) => setTransferTitle(e.target.value)}
              placeholder="Görev adı girin…"
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 10 }} />
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Stajyer</label>
            <select value={transferInternId} onChange={(e) => setTransferInternId(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 10 }}>
              <option value="">Stajyer seçin…</option>
              {interns.map((i: any) => (
                <option key={i.id} value={i.id}>{i.user?.name}</option>
              ))}
            </select>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Bitiş tarihi</label>
            <input type="date" value={transferDue} onChange={(e) => setTransferDue(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleTransfer} disabled={transferring || !transferTitle.trim() || !transferInternId || !transferDue}
                style={{ flex: 1, border: 'none', background: '#1E3A5F', color: '#fff', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {transferring ? '…' : 'Aktar'}
              </button>
              <button onClick={() => setShowTransfer(false)}
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

export default function GorevlerimPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  // Bölüm (proje/görev) için opsiyonel bitiş tarihi — başlangıç zaten
  // otomatik (oluşturulma anı), kullanıcı sadece bunu giriyor.
  const [newBoardDue, setNewBoardDue] = useState('');
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
      await adminTasksApi.createBoard(newBoardName.trim(), undefined, newBoardDue || undefined);
      setNewBoardName(''); setNewBoardDue(''); setAddingBoard(false);
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
          <div style={{ display: 'flex', gap: 8, maxWidth: 460, flexWrap: 'wrap' }}>
            <input autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()} placeholder="Bölüm adı (örn. Yazılım Geliştirme)…"
              style={{ flex: 1, minWidth: 180, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <input type="date" value={newBoardDue} onChange={(e) => setNewBoardDue(e.target.value)}
              title="Bitiş tarihi (opsiyonel)"
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13 }} />
            <button onClick={handleCreateBoard} disabled={savingBoard || !newBoardName.trim()}
              style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 8, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {savingBoard ? '…' : 'Oluştur'}
            </button>
            <button onClick={() => { setAddingBoard(false); setNewBoardName(''); setNewBoardDue(''); }}
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
