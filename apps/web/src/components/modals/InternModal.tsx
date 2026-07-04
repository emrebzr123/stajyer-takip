'use client';
import React, { useEffect, useState, useRef } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { internsApi, companiesApi } from '@/lib/api';
import api from '@/lib/api';
import { TURKISH_UNIVERSITIES, ACADEMIC_DEPARTMENTS } from '@/lib/turkish-universities';
import toast from 'react-hot-toast';

interface InternModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  intern?: any;
}

const WORK_TYPES  = ['Tam Zamanlı', 'Uzaktan', 'Hibrit'];
const INTERN_TYPES = ['Yaz Stajı', 'Dönem İçi Stajı', 'Zorunlu Staj', 'Gönüllü Staj'];
const WEEK_DAYS   = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const STATUSES    = ['Aktif', 'Pasif', 'Mezun', 'Ayrıldı'];

// Autocomplete bileşeni
function AutocompleteInput({
  label, value, onChange, suggestions, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = q.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        value={q}
        placeholder={placeholder}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <div
              key={s}
              onClick={() => { setQ(s); onChange(s); setOpen(false); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Firma Creatable Dropdown
function CompanySelect({
  value, onChange, companies, onCompaniesChange,
}: {
  value: string; onChange: (id: string, name: string) => void;
  companies: any[]; onCompaniesChange: (list: any[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedName = companies.find(c => c.id === value)?.name || '';

  useEffect(() => { setQ(selectedName); }, [selectedName]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = q.trim()
    ? companies.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    : companies;

  const exactMatch = companies.some(c => c.name.toLowerCase() === q.toLowerCase());
  const showCreate = q.trim() && !exactMatch;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await companiesApi.findOrCreate(q.trim());
      const newCompany = res.data;
      onCompaniesChange([...companies, newCompany]);
      onChange(newCompany.id, newCompany.name);
      setQ(newCompany.name);
      setOpen(false);
      toast.success(`"${newCompany.name}" firmaya eklendi.`);
    } catch { toast.error('Firma eklenemedi.'); }
    finally { setCreating(false); }
  };

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      <label className="form-label">Firma *</label>
      <input
        className="form-input"
        value={q}
        placeholder="Firma seçin veya yazın..."
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => { onChange(c.id, c.name); setQ(c.name); setOpen(false); }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              🏢 {c.name}
            </div>
          ))}
          {showCreate && (
            <div
              onClick={handleCreate}
              style={{
                padding: '10px 14px', cursor: creating ? 'wait' : 'pointer', fontSize: 13,
                color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                borderTop: '2px solid var(--primary-light)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              ＋ Yeni Firma Olarak Ekle: "{q}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InternModal({ open, onClose, onSuccess, intern }: InternModalProps) {
  const isEdit = !!intern;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'kisisel' | 'staj' | 'diger'>('kisisel');

  const [form, setForm] = useState({
    // Kişisel
    name: '', email: '', password: '', phone: '',
    // Firma/Staj
    companyId: '', companyName: '',
    departmentName: '', mentorName: '',
    // Akademik
    university: '', academicDepartment: '', gpa: '',
    // Staj detay
    term: '', status: 'Aktif',
    startDate: '', endDate: '',
    internType: 'Yaz Stajı', workType: 'Tam Zamanlı',
    hybridDays: [] as string[],
    // Diğer
    tcNo: '', birthDate: '', address: '', notes: '',
  });

  useEffect(() => {
    if (!open) return;
    companiesApi.getAll().then(r => setCompanies(r.data || [])).catch(() => {});
    setActiveTab('kisisel');

    if (intern) {
      setForm({
        name: intern.user?.name || '',
        email: intern.user?.email || '',
        password: '',
        phone: intern.phone || '',
        companyId: intern.companyId || '',
        companyName: intern.company?.name || '',
        departmentName: intern.department?.name || '',
        mentorName: intern.mentor?.name || '',
        university: intern.university || '',
        academicDepartment: intern.academicDepartment || '',
        gpa: intern.gpa || '',
        term: intern.term || '',
        status: intern.status || 'Aktif',
        startDate: intern.startDate?.split('T')[0] || '',
        endDate: intern.endDate?.split('T')[0] || '',
        internType: intern.internType || 'Yaz Stajı',
        workType: intern.workType || 'Tam Zamanlı',
        hybridDays: intern.hybridDays || [],
        tcNo: intern.tcNo || '',
        birthDate: intern.birthDate || '',
        address: intern.address || '',
        notes: intern.notes || '',
      });
    } else {
      setForm({
        name: '', email: '', password: '', phone: '',
        companyId: '', companyName: '',
        departmentName: '', mentorName: '',
        university: '', academicDepartment: '', gpa: '',
        term: '', status: 'Aktif', startDate: '', endDate: '',
        internType: 'Yaz Stajı', workType: 'Tam Zamanlı', hybridDays: [],
        tcNo: '', birthDate: '', address: '', notes: '',
      });
    }
  }, [open, intern]);

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      hybridDays: f.hybridDays.includes(day)
        ? f.hybridDays.filter(d => d !== day)
        : [...f.hybridDays, day],
    }));
  };

  const resolveDepartmentId = async (name: string) => {
    if (!name.trim()) return undefined;
    try {
      const res = await api.get('/departments');
      const all = res.data || [];
      const found = all.find((d: any) => d.name.toLowerCase() === name.trim().toLowerCase());
      if (found) return found.id;
      const created = await api.post('/departments', { name: name.trim() });
      return created.data.id;
    } catch { return undefined; }
  };

  const resolveMentorId = async (name: string) => {
    if (!name.trim()) return undefined;
    try {
      const res = await api.get('/users');
      const all = res.data || [];
      const found = all.find((u: any) => u.name.toLowerCase() === name.trim().toLowerCase());
      if (found) return found.id;
      const email = `${name.trim().toLowerCase().replace(/\s+/g, '.')}@mentor.com`;
      const created = await api.post('/users', { name: name.trim(), email, password: 'password123', role: 'manager' });
      return created.data.id;
    } catch { return undefined; }
  };

  const handleSubmit = async () => {
    if (!isEdit && (!form.name.trim() || !form.email.trim() || !form.password.trim())) {
      toast.error('Ad soyad, e-posta ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    try {
      const departmentId = await resolveDepartmentId(form.departmentName);
      const mentorId = await resolveMentorId(form.mentorName);

      const internData: any = {
        companyId:           form.companyId || undefined,
        departmentId,
        mentorId,
        term:                form.term,
        status:              form.status,
        startDate:           form.startDate || undefined,
        endDate:             form.endDate || undefined,
        phone:               form.phone,
        university:          form.university,
        academicDepartment:  form.academicDepartment,
        gpa:                 form.gpa,
        internType:          form.internType,
        workType:            form.workType,
        hybridDays:          form.workType === 'Hibrit' ? form.hybridDays : [],
        tcNo:                form.tcNo,
        birthDate:           form.birthDate,
        address:             form.address,
        notes:               form.notes,
      };

      if (isEdit) {
        await internsApi.update(intern.id, internData);
        toast.success('Stajyer güncellendi.');
      } else {
        const userRes = await api.post('/users', {
          name: form.name.trim(), email: form.email.trim(),
          password: form.password, role: 'intern',
        });
        await internsApi.create({ userId: userRes.data.id, ...internData });
        toast.success('Stajyer eklendi.');
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const f = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  });

  const TAB_STYLE = (t: string) => ({
    padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    borderBottom: activeTab === t ? '2px solid var(--primary)' : '2px solid transparent',
    color: activeTab === t ? 'var(--primary)' : 'var(--text-secondary)',
    background: 'none', border: 'none',
  } as React.CSSProperties);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Stajyer Düzenle' : 'Yeni Stajyer Ekle'}</span>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', gap: 4 }}>
          <button style={TAB_STYLE('kisisel')} onClick={() => setActiveTab('kisisel')}>👤 Kişisel Bilgiler</button>
          <button style={TAB_STYLE('staj')} onClick={() => setActiveTab('staj')}>🏢 Staj Detayları</button>
          <button style={TAB_STYLE('diger')} onClick={() => setActiveTab('diger')}>📋 Diğer</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── Tab 1: Kişisel Bilgiler ── */}
          {activeTab === 'kisisel' && (
            <>
              {!isEdit && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ad Soyad *</label>
                      <input className="form-input" {...f('name')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-posta *</label>
                      <input className="form-input" type="email" {...f('email')} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Şifre *</label>
                    <input className="form-input" type="password" {...f('password')} />
                    <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Stajyer bu şifreyle giriş yapacak</small>
                  </div>
                </>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-input" placeholder="05xx xxx xxxx" {...f('phone')} />
                </div>
                <div className="form-group">
                  <label className="form-label">TC Kimlik No</label>
                  <input className="form-input" placeholder="Opsiyonel" {...f('tcNo')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Doğum Tarihi</label>
                  <input className="form-input" type="date" {...f('birthDate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">GNO / Not Ortalaması</label>
                  <input className="form-input" placeholder="3.50" {...f('gpa')} />
                </div>
              </div>
              <AutocompleteInput
                label="Üniversite"
                value={form.university}
                onChange={v => setForm(p => ({ ...p, university: v }))}
                suggestions={TURKISH_UNIVERSITIES}
                placeholder="Üniversite adı yazın..."
              />
              <AutocompleteInput
                label="Akademik Bölüm"
                value={form.academicDepartment}
                onChange={v => setForm(p => ({ ...p, academicDepartment: v }))}
                suggestions={ACADEMIC_DEPARTMENTS}
                placeholder="Bölüm adı yazın..."
              />
              <div className="form-group">
                <label className="form-label">Adres</label>
                <textarea className="form-textarea" rows={2} {...f('address')} />
              </div>
            </>
          )}

          {/* ── Tab 2: Staj Detayları ── */}
          {activeTab === 'staj' && (
            <>
              <CompanySelect
                value={form.companyId}
                onChange={(id, name) => setForm(p => ({ ...p, companyId: id, companyName: name }))}
                companies={companies}
                onCompaniesChange={setCompanies}
              />
              <div className="form-group">
                <label className="form-label">Departman (Firma İçi Bölüm)</label>
                <input className="form-input" placeholder="Departman adını yazın" {...f('departmentName')} />
              </div>
              <div className="form-group">
                <label className="form-label">Mentör</label>
                <input className="form-input" placeholder="Mentör adını yazın" {...f('mentorName')} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dönem / Staj Yılı</label>
                  <input className="form-input" placeholder="Örn: 2026 Yaz" {...f('term')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Durum</label>
                  <select className="form-select" {...f('status')}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç Tarihi</label>
                  <input className="form-input" type="date" {...f('startDate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş Tarihi</label>
                  <input className="form-input" type="date" {...f('endDate')} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Staj Türü</label>
                  <select className="form-select" {...f('internType')}>
                    {INTERN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Çalışma Şekli *</label>
                  <select className="form-select" {...f('workType')}>
                    {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Hibrit Günler — conditional */}
              {form.workType === 'Hibrit' && (
                <div className="form-group">
                  <label className="form-label">Hibrit Günler</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    {WEEK_DAYS.map(day => (
                      <label
                        key={day}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                          padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                          border: `1px solid ${form.hybridDays.includes(day) ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.hybridDays.includes(day) ? 'var(--primary-light)' : '#fff',
                          color: form.hybridDays.includes(day) ? 'var(--primary)' : 'var(--text-secondary)',
                          transition: 'all .15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.hybridDays.includes(day)}
                          onChange={() => toggleDay(day)}
                          style={{ display: 'none' }}
                        />
                        {form.hybridDays.includes(day) ? '✓ ' : ''}{day}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Tab 3: Diğer ── */}
          {activeTab === 'diger' && (
            <>
              <div className="form-group">
                <label className="form-label">Notlar</label>
                <textarea className="form-textarea" rows={4} placeholder="Stajyer hakkında notlar..." {...f('notes')} />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            {activeTab !== 'kisisel' && (
              <button className="btn-secondary" onClick={() =>
                setActiveTab(activeTab === 'diger' ? 'staj' : 'kisisel')}>
                ← Geri
              </button>
            )}
            {activeTab !== 'diger' && (
              <button className="btn-secondary" onClick={() =>
                setActiveTab(activeTab === 'kisisel' ? 'staj' : 'diger')}>
                İleri →
              </button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>İptal</Button>
          <Button loading={loading} onClick={handleSubmit}>
            {isEdit ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </div>
    </div>
  );
}
