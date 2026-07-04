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
import { tasksApi } from '@/lib/api';
import toast from 'react-hot-toast';

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
          <button className="btn-secondary">
            <Icon name="download" size={16} /> Dışa Aktar
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
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
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Yükleniyor…</td></tr>
              ) : error ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>{error}</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Görev bulunamadı.</td></tr>
              ) : (
                data.map((task: any) => (
                  <tr key={task.id}>
                    <td>
                      <div className="task-cell">
                        <div className="title">{task.title}</div>
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
                    <td>
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
    </>
  );
}
