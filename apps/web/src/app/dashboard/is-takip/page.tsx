'use client';
import React, { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import Pagination from '@/components/layout/Pagination';
import StatCard from '@/components/ui/StatCard';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import ProgressBar from '@/components/ui/ProgressBar';
import TaskModal from '@/components/modals/TaskModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
import { useTasks } from '@/hooks/useTasks';
import { formatDate, progressColor } from '@/lib/utils';
import { tasksApi, subtasksApi } from '@/lib/api';
import api from '@/lib/api';
import { exportToExcel } from '@/lib/export';
import MessagePreviewModal from '@/components/modals/MessagePreviewModal';
import toast from 'react-hot-toast';

// ─── Genişletilmiş satır: checklist (tıklanabilir) + yorum akışı ─────────────
// Yönetici, göreve tıklayınca hangi alt görevlerin bittiğini görür, gerekirse
// kendisi de işaretleyebilir; ayrıca stajyerle görev üzerinden yazışabilir.
function TaskDetailRow({ task, colSpan, onTaskChange }: { task: any; colSpan: number; onTaskChange: () => void }) {
  const [subtasks, setSubtasks] = useState<any[]>(task.subtasks || []);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  React.useEffect(() => {
    api.get(`/tasks/${task.id}/comments`)
      .then(r => setComments(r.data || []))
      .catch(() => undefined)
      .finally(() => setCommentsLoading(false));
  }, [task.id]);

  const toggleSubtask = async (s: any) => {
    setToggling(s.id);
    setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, isCompleted: !s.isCompleted } : x));
    try {
      await subtasksApi.toggle(s.id, !s.isCompleted);
      onTaskChange();
    } catch {
      setSubtasks(prev => prev.map(x => x.id === s.id ? { ...x, isCompleted: s.isCompleted } : x));
      toast.error('Güncellenemedi.');
    } finally { setToggling(null); }
  };

  const sendComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    setSending(true);
    try {
      const r = await api.post(`/tasks/${task.id}/comments`, { content });
      setComments(prev => [...prev, r.data]);
      setNewComment('');
    } catch {
      toast.error('Yorum gönderilemedi.');
    } finally { setSending(false); }
  };

  return (
    <tr>
      <td colSpan={colSpan} style={{ background: '#F8FAFC', padding: '14px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Alt görevler */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
              Alt Görevler ({subtasks.filter((s: any) => s.isCompleted).length}/{subtasks.length})
            </div>
            {subtasks.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Bu görevde alt görev (checklist) yok.</div>
            ) : subtasks.map((s: any) => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', opacity: toggling === s.id ? .6 : 1 }}>
                <input type="checkbox" checked={s.isCompleted} disabled={toggling === s.id}
                  onChange={() => toggleSubtask(s)}
                  style={{ width: 15, height: 15, accentColor: '#22C55E', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, textDecoration: s.isCompleted ? 'line-through' : 'none', color: s.isCompleted ? 'var(--text-secondary)' : 'inherit' }}>
                  {s.title}
                </span>
              </label>
            ))}
          </div>

          {/* Yorumlar */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
              💬 Yorumlar
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 8 }}>
              {commentsLoading ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Yükleniyor…</div>
              ) : comments.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Henüz yorum yok.</div>
              ) : comments.map((c: any) => (
                <div key={c.id} style={{ marginBottom: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                    {c.author?.name || 'Bilinmiyor'}
                    <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 6 }}>
                      {new Date(c.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" style={{ flex: 1, fontSize: 13 }} placeholder="Stajyere not yazın…"
                value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()} />
              <button onClick={sendComment} disabled={sending || !newComment.trim()}
                style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {sending ? '…' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function IsTakipPage() {
  const {
    data, stats, loading, error,
    page, setPage, total, totalPages,
    search, setSearch,
    statusFilter, setStatus,
    priorityFilter, setPriority,
    refresh,
  } = useTasks();

  const [modal, setModal]       = useState<{ open: boolean; task?: any }>({ open: false });
  const [confirm, setConfirm]   = useState<{ open: boolean; id?: string }>({ open: false });
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [msgModal, setMsgModal] = useState<{ open: boolean; konu: string; mesaj: string; title: string }>({ open: false, konu: '', mesaj: '', title: '' });

  // Çok görevi olan bir stajyerin görevlerini tek tek silmek yerine seçip
  // toplu silebilmek için: seçim state'i + onay + ilerleme göstergesi.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const allOnPageSelected = data.length > 0 && data.every((t: any) => selected.has(t.id));
  const toggleSelectAll = () => {
    setSelected(prev => {
      if (allOnPageSelected) {
        const next = new Set(prev);
        data.forEach((t: any) => next.delete(t.id));
        return next;
      }
      const next = new Set(prev);
      data.forEach((t: any) => next.add(t.id));
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    let failCount = 0;
    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await tasksApi.remove(id);
      } catch { failCount++; }
    }
    setBulkDeleting(false);
    setBulkConfirm(false);
    setSelected(new Set());
    if (failCount) toast.error(`${ids.length - failCount} görev silindi, ${failCount} tanesi silinemedi.`);
    else toast.success(`${ids.length} görev silindi.`);
    refresh();
  };

  // Ekranda görünen (filtrelenmiş) görevleri gerçek Excel dosyası olarak indirir.
  const handleExport = () => {
    if (!data.length) { toast('Aktarılacak görev yok.', { icon: 'ℹ️' }); return; }
    exportToExcel(
      data.map((t: any) => ({
        'Görev': t.title,
        'Açıklama': t.description || '-',
        'Stajyer': t.intern?.user?.name || '-',
        'Bölüm': t.department?.name || t.intern?.department?.name || '-',
        'Öncelik': t.priority,
        'Durum': t.status,
        'İlerleme (%)': t.progress,
        'Alt Görev': t.subtasks?.length ? `${t.subtasks.filter((s: any) => s.isCompleted).length}/${t.subtasks.length}` : '-',
        'Son Tarih': formatDate(t.dueDate),
        'Oluşturulma': formatDate(t.createdAt),
      })),
      'is-takip-listesi',
      'Görevler',
    );
  };

  const STAT_CARDS = stats
    ? [
        { label: 'Toplam Görev',    value: stats.total,            icon: 'clipboard-list', color: 'blue',   sub: 'Tüm görevler' },
        { label: 'Tamamlandı',      value: stats.completed,        icon: 'check',          color: 'green',  pct: stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%' },
        { label: 'Devam Ediyor',    value: stats.inProgress,       icon: 'refresh',        color: 'orange', pct: stats.total ? `${Math.round((stats.inProgress / stats.total) * 100)}%` : '0%' },
        { label: 'Gecikmiş',        value: stats.delayed,          icon: 'x',              color: 'red',    pct: stats.total ? `${Math.round((stats.delayed / stats.total) * 100)}%` : '0%' },
        { label: 'Bu Hafta Teslim', value: stats.dueSoon,          icon: 'calendar',       color: 'purple', sub: 'Yaklaşan son tarihler' },
        { label: 'Ort. İlerleme',   value: `%${stats.averageProgress}`, icon: 'chart',    color: 'gray',   sub: 'Tüm görevler ortalaması' },
      ]
    : [];

  const handleSuccess = () => {
    setModal({ open: false });
    setTimeout(() => refresh(), 300);
  };

  const handleDelete = async () => {
    if (!confirm.id) return;
    setDeleting(true);
    try {
      await tasksApi.remove(confirm.id);
      toast.success('Görev silindi.');
      setConfirm({ open: false });
      setTimeout(() => refresh(), 300);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Silme işlemi başarısız.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="İş Takip Listesi"
        subtitle="Tüm görevleri listeleyin, durumlarını takip edin ve ilerlemeyi yönetin."
        btnText="Yeni Görev Oluştur"
        onBtnClick={() => setModal({ open: true })}
      />

      <div className="stats-row stats-row-6">
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* FilterBar — Filtrele butonu yok, sadece arama ve dropdown'lar */}
      <div className="filter-bar">
        <div className="search-input" style={{ flex: 1 }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Görev ara (başlık, stajyer...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Durum: Tümü</option>
          {['Planlandı', 'Devam Ediyor', 'Beklemede', 'Tamamlandı', 'Gecikmiş'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Öncelik: Tümü</option>
          {['Yüksek', 'Orta', 'Düşük'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div className="filter-actions">
          <button className="btn-secondary" onClick={handleExport}>
            <Icon name="download" size={16} /> Dışa Aktar
          </button>
        </div>
      </div>

      {/* Toplu işlem çubuğu — çok görevi olan bir stajyerin görevlerini tek
          tek silmek yerine seçip tek seferde silebilmek için. */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          padding: '10px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FCA5A5',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>
            {selected.size} görev seçildi
          </span>
          {bulkConfirm ? (
            <>
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {bulkDeleting ? 'Siliniyor…' : `Evet, ${selected.size} görevi sil`}
              </button>
              <button onClick={() => setBulkConfirm(false)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#fff', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Vazgeç
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setBulkConfirm(true)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="trash" size={13} /> Seçilenleri Sil
              </button>
              <button onClick={() => setSelected(new Set())}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                Seçimi Temizle
              </button>
            </>
          )}
        </div>
      )}

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                </th>
                <th>Görev</th>
                <th>Stajyer</th>
                <th>Bölüm</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th>Son Tarih</th>
                <th>Oluşturulma</th>
                <th>İlerleme</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
              ) : error ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>{error}</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Görev bulunamadı.</td></tr>
              ) : (
                data.map((task: any) => (
                  <React.Fragment key={task.id}>
                  <tr onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    style={{ cursor: 'pointer', background: expandedId === task.id ? '#F8FAFC' : selected.has(task.id) ? '#FEF2F2' : undefined }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(task.id)} onChange={() => toggleSelectOne(task.id)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                    </td>
                    <td>
                      <div className="task-cell">
                        <div className="title">
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginRight: 6 }}>
                            {expandedId === task.id ? '▼' : '▶'}
                          </span>
                          {task.title}
                        </div>
                        <div className="desc">{task.description}</div>
                      </div>
                    </td>
                    <td>
                      <div className="intern-cell">
                        <Avatar name={task.intern?.user?.name || '-'} size="sm" />
                        <span style={{ fontWeight: 500 }}>{task.intern?.user?.name}</span>
                      </div>
                    </td>
                    <td>{task.department?.name || task.intern?.department?.name || '-'}</td>
                    <td><Badge text={task.priority} /></td>
                    <td><Badge text={task.status} /></td>
                    <td className={task.isOverdue ? 'text-red' : ''}>{formatDate(task.dueDate)}</td>
                    <td>{formatDate(task.createdAt)}</td>
                    <td>
                      <div className="table-progress">
                        <ProgressBar value={task.progress} color={progressColor(task.status)} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{task.progress}%</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-btns">
                        <button
                          className="action-btn edit"
                          onClick={() => setModal({ open: true, task })}
                          title="Düzenle"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        
                        <button
                          className="action-btn delete"
                          onClick={() => setConfirm({ open: true, id: task.id })}
                          title="Sil"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === task.id && (
                    <TaskDetailRow task={task} colSpan={10} onTaskChange={() => setTimeout(() => refresh(), 300)} />
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={total}
          label="görev"
          page={page}
          totalPages={totalPages}
          limit={10}
          onPageChange={setPage}
        />
      </div>

      <TaskModal
        open={modal.open}
        task={modal.task}
        onClose={() => setModal({ open: false })}
        onSuccess={handleSuccess}
      />

      <ConfirmModal
        open={confirm.open}
        message="Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        onConfirm={handleDelete}
        onClose={() => setConfirm({ open: false })}
        loading={deleting}
      />
      <MessagePreviewModal open={msgModal.open} konu={msgModal.konu} mesaj={msgModal.mesaj} title={msgModal.title} onClose={() => setMsgModal(p => ({...p, open: false}))} />
    </>
  );
}
