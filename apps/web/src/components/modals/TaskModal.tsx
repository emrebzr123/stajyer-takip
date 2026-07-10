'use client';
import React, { useEffect, useState } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { tasksApi, internsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: any;
}

export default function TaskModal({ open, onClose, onSuccess, task }: TaskModalProps) {
  const isEdit = !!task;
  const [loading, setLoading] = useState(false);
  const [interns, setInterns] = useState<any[]>([]);
  const [subtaskInputs, setSubtaskInputs] = useState<string[]>(['']);

  const [form, setForm] = useState({
    title: '', description: '', internId: '',
    departmentId: '', departmentName: '',
    priority: 'Orta', status: 'Planlandı',
    progress: 0, dueDate: '',
  });

  useEffect(() => {
    if (!open) return;
    internsApi.getAll({ limit: 100 }).then((r) => setInterns(r.data.data || []));
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        internId: task.internId || '',
        departmentId: task.departmentId || '',
        departmentName: task.department?.name || task.intern?.academicDepartment || '',
        priority: task.priority || 'Orta',
        status: task.status || 'Planlandı',
        progress: task.progress || 0,
        dueDate: task.dueDate?.split('T')[0] || '',
      });
      // Mevcut subtask'ları yükle
      if (task.subtasks?.length) {
        setSubtaskInputs(task.subtasks.map((s: any) => s.title));
      } else {
        setSubtaskInputs(['']);
      }
    } else {
      setForm({ title: '', description: '', internId: '', departmentId: '', departmentName: '', priority: 'Orta', status: 'Planlandı', progress: 0, dueDate: '' });
      setSubtaskInputs(['']);
    }
  }, [open, task]);

  const handleInternChange = (internId: string) => {
    const intern = interns.find((i) => i.id === internId);
    setForm((f) => ({
      ...f, internId,
      departmentId: intern?.departmentId || '',
      departmentName: intern?.academicDepartment || intern?.department?.name || '',
    }));
  };

  const addSubtask = () => setSubtaskInputs(p => [...p, '']);
  const removeSubtask = (i: number) => setSubtaskInputs(p => p.filter((_,j) => j !== i));
  const updateSubtask = (i: number, val: string) => setSubtaskInputs(p => p.map((s,j) => j===i ? val : s));

  const handleSubmit = async () => {
    if (!form.title || !form.internId || !form.dueDate) {
      toast.error('Başlık, stajyer ve bitiş tarihi zorunludur.');
      return;
    }
    setLoading(true);
    try {
      const validSubtasks = subtaskInputs.filter(s => s.trim());
      const payload: any = {
        title: form.title, description: form.description,
        internId: form.internId, priority: form.priority,
        status: form.status, dueDate: form.dueDate,
        subtasks: validSubtasks.map((title, i) => ({ title, isCompleted: false, orderIndex: i })),
      };
      if (form.departmentId) payload.departmentId = form.departmentId;
      if (isEdit) payload.progress = form.progress;

      if (isEdit) {
        await tasksApi.update(task.id, payload);
        toast.success('Görev güncellendi.');
      } else {
        await tasksApi.create(payload);
        toast.success('Görev oluşturuldu.');
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Bir hata oluştu.');
    } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Görevi Düzenle' : 'Yeni Görev Oluştur'}</span>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Görev Başlığı *</label>
            <input className="form-input" placeholder="Görev başlığını girin"
              value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Açıklama</label>
            <textarea className="form-textarea" placeholder="Görev açıklaması"
              value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stajyer *</label>
              <select className="form-select" value={form.internId} onChange={(e) => handleInternChange(e.target.value)}>
                <option value="">Stajyer seçin</option>
                {interns.map((i) => <option key={i.id} value={i.id}>{i.user?.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Akademik Bölüm</label>
              <input className="form-input" value={form.departmentName} disabled
                style={{ background: '#F9FAFB', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Öncelik</label>
              <select className="form-select" value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['Yüksek','Orta','Düşük'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Durum</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                {['Planlandı','Devam Ediyor','Beklemede','Tamamlandı','Gecikmiş'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bitiş Tarihi *</label>
            <input className="form-input" type="date" value={form.dueDate}
              onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
          {isEdit && (
            <div className="form-group">
              <label className="form-label">İlerleme ({form.progress}%)</label>
              <input type="range" min={0} max={100} step={5} value={form.progress}
                onChange={(e) => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))}
                style={{ width: '100%', marginTop: 8 }} />
            </div>
          )}

          {/* Alt Görevler (Checklist) */}
          <div className="form-group">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label className="form-label" style={{ margin:0 }}>✅ Alt Görevler (Checklist)</label>
              <button type="button" onClick={addSubtask}
                style={{ fontSize:12, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                + Ekle
              </button>
            </div>
            {subtaskInputs.map((val, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
                <input className="form-input" placeholder={`Alt görev ${i+1}`}
                  value={val} onChange={(e) => updateSubtask(i, e.target.value)}
                  style={{ flex:1 }} />
                {subtaskInputs.length > 1 && (
                  <button type="button" onClick={() => removeSubtask(i)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', fontSize:18, padding:'0 4px' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <small style={{ color:'var(--text-secondary)', fontSize:11 }}>
              Alt görevler tamamlandıkça ilerleme otomatik hesaplanır
            </small>
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>İptal</Button>
          <Button loading={loading} onClick={handleSubmit}>{isEdit ? 'Güncelle' : 'Oluştur'}</Button>
        </div>
      </div>
    </div>
  );
}