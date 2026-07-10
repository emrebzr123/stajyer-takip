'use client';
import React, { useEffect, useState, useRef } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { internsApi, companiesApi, usersApi } from '@/lib/api';
import api from '@/lib/api';
import { DEFAULT_DEPARTMENTS, DEFAULT_COMPANIES, DEFAULT_MENTORS } from '@/lib/constants';
import { TURKISH_UNIVERSITIES, ACADEMIC_DEPARTMENTS } from '@/lib/turkish-universities';
import { toEmailLocalPart, getDefaultTerm } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InternModalProps {
  open: boolean; onClose: () => void; onSuccess: () => void; intern?: any;
}

const WORK_TYPES   = ['Tam Zamanlı', 'Uzaktan', 'Hibrit'];
const INTERN_TYPES = ['Yaz Stajı', 'Dönem İçi Stajı', 'Zorunlu Staj', 'Gönüllü Staj'];
const WEEK_DAYS    = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const STATUSES     = ['Aktif', 'Pasif', 'Mezun', 'Ayrıldı'];

// Tek bileşen: combobox (yazabilir + listeden seçebilir + yeni ekleyebilir)
function ComboBox({ label, value, onChange, options, onAddNew, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; onAddNew?: (v: string) => Promise<void>; placeholder?: string;
}) {
  const [q, setQ]       = useState(value);
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered  = q.trim() ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;
  const exactMatch = options.some(o => o.toLowerCase() === q.trim().toLowerCase());
  const showAdd    = onAddNew && q.trim() && !exactMatch;

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <input className="form-input" value={q} placeholder={placeholder}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && (filtered.length > 0 || showAdd) && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:999,
          background:'#fff', border:'1px solid var(--border)', borderRadius:8,
          boxShadow:'0 4px 16px rgba(0,0,0,.1)', maxHeight:220, overflowY:'auto',
        }}>
          {filtered.map(o => (
            <div key={o} onClick={() => { setQ(o); onChange(o); setOpen(false); }}
              style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:'1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background='#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background='')}>
              {o}
            </div>
          ))}
          {showAdd && (
            <div onClick={async () => { await onAddNew!(q.trim()); setOpen(false); }}
              style={{
                padding:'10px 14px', cursor:'pointer', fontSize:13, fontWeight:700,
                color:'var(--primary)', borderTop:'2px solid var(--primary-light)', background:'#EFF6FF',
              }}
              onMouseEnter={e => (e.currentTarget.style.background='#DBEAFE')}
              onMouseLeave={e => (e.currentTarget.style.background='#EFF6FF')}>
              ＋ "{q.trim()}" olarak ekle
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface EntityOption { id: string; name: string; }

// Firma ve Mentör için: yazabilir + listeden seçebilir + yeni ekleyebilir
// + kayıtlı olanı silebilir (silme sadece gerçek bir id'si olan — yani
// veritabanında kayıtlı — seçenekler için gösterilir; henüz hiç
// kullanılmamış statik öneriler id taşımaz).
function EntityComboBox({ label, value, onChange, options, onAddNew, onDelete, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: EntityOption[];
  onAddNew: (v: string) => Promise<void>;
  onDelete?: (opt: EntityOption) => Promise<void>;
  placeholder?: string;
}) {
  const [q, setQ]               = useState(value);
  const [open, setOpen]         = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const ref                     = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirmId(null); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered   = q.trim() ? options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())) : options;
  const exactMatch = options.some(o => o.name.toLowerCase() === q.trim().toLowerCase());
  const showAdd    = q.trim() && !exactMatch;

  const handleDeleteClick = async (opt: EntityOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || !opt.id) return;
    if (confirmId !== opt.id) { setConfirmId(opt.id); return; }
    setDeletingId(opt.id);
    try {
      await onDelete(opt);
      if (q.trim().toLowerCase() === opt.name.toLowerCase()) { setQ(''); onChange(''); }
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <input className="form-input" value={q} placeholder={placeholder}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && (filtered.length > 0 || showAdd) && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:999,
          background:'#fff', border:'1px solid var(--border)', borderRadius:8,
          boxShadow:'0 4px 16px rgba(0,0,0,.1)', maxHeight:240, overflowY:'auto',
        }}>
          {filtered.map(o => (
            <div key={o.id || o.name} style={{
              display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background='#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background='')}>
              <div onClick={() => { setQ(o.name); onChange(o.name); setOpen(false); setConfirmId(null); }}
                style={{ flex:1, padding:'10px 14px', cursor:'pointer', fontSize:13 }}>
                {o.name}
              </div>
              {onDelete && o.id && (
                <button type="button" onClick={(e) => handleDeleteClick(o, e)} disabled={deletingId === o.id}
                  title={confirmId === o.id ? 'Emin misiniz? Tekrar tıklayın' : 'Sil'}
                  style={{
                    border:'none', background:'none', cursor:'pointer', padding:'8px 12px',
                    color: confirmId === o.id ? '#EF4444' : 'var(--text-secondary)',
                    fontSize: confirmId === o.id ? 11 : 13, fontWeight: confirmId === o.id ? 700 : 400,
                    whiteSpace:'nowrap',
                  }}>
                  {deletingId === o.id ? '…' : confirmId === o.id ? 'Emin mi?' : '✕'}
                </button>
              )}
            </div>
          ))}
          {showAdd && (
            <div onClick={async () => { await onAddNew(q.trim()); setOpen(false); }}
              style={{
                padding:'10px 14px', cursor:'pointer', fontSize:13, fontWeight:700,
                color:'var(--primary)', borderTop:'2px solid var(--primary-light)', background:'#EFF6FF',
              }}
              onMouseEnter={e => (e.currentTarget.style.background='#DBEAFE')}
              onMouseLeave={e => (e.currentTarget.style.background='#EFF6FF')}>
              ＋ "{q.trim()}" olarak ekle
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Autocomplete (sadece filtreleme, yeni ekleme yok)
function AutocompleteInput({ label, value, onChange, suggestions, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState(value);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(value); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = q.trim() ? suggestions.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0,8) : [];

  return (
    <div className="form-group" ref={ref} style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>
      <input className="form-input" value={q} placeholder={placeholder}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && filtered.length > 0 && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:999,
          background:'#fff', border:'1px solid var(--border)', borderRadius:8,
          boxShadow:'0 4px 16px rgba(0,0,0,.1)', maxHeight:220, overflowY:'auto',
        }}>
          {filtered.map(s => (
            <div key={s} onClick={() => { setQ(s); onChange(s); setOpen(false); }}
              style={{ padding:'10px 14px', cursor:'pointer', fontSize:13, borderBottom:'1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.background='#F3F4F6')}
              onMouseLeave={e => (e.currentTarget.style.background='')}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Statik öneri listesini (id'siz) API'den gelen gerçek kayıtlarla (id'li)
// birleştirir; aynı isim API'de varsa API'nin id'si kullanılır (böylece
// silinebilir hale gelir).
function mergeEntityOptions(defaults: string[], apiItems: EntityOption[]): EntityOption[] {
  const byName = new Map<string, EntityOption>();
  for (const name of defaults) byName.set(name.toLowerCase(), { id: '', name });
  for (const item of apiItems) byName.set(item.name.toLowerCase(), item);
  return Array.from(byName.values());
}

export default function InternModal({ open, onClose, onSuccess, intern }: InternModalProps) {
  const isEdit = !!intern;
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState<'kisisel'|'staj'|'diger'>('kisisel');
  const [companies, setCompanies]   = useState<EntityOption[]>(DEFAULT_COMPANIES.map(name => ({ id:'', name })));
  const [mentors, setMentors]       = useState<EntityOption[]>(DEFAULT_MENTORS.map(name => ({ id:'', name })));
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);

  const [form, setForm] = useState({
    name:'', email:'', password:'',
    companyName:'', mentorName:'', departmentName:'',
    university:'', academicDepartment:'', gpa:'',
    term:'', status:'Aktif', startDate:'', endDate:'',
    internType:'Yaz Stajı', workType:'Tam Zamanlı',
    hybridDays:[] as string[],
    tcNo:'', birthDate:'', address:'', notes:'', phone:'',
  });

  // Mevcut firmalar/mentörler API'den yükle
  const loadCompanies = () => {
    companiesApi.getAll().then(r => {
      const apiItems: EntityOption[] = (r.data || []).map((c: any) => ({ id: c.id, name: c.name }));
      setCompanies(mergeEntityOptions(DEFAULT_COMPANIES, apiItems));
    }).catch(() => {});
  };
  const loadMentors = () => {
    // NOT: Önceden `role !== 'intern'` filtresi kullanılıyordu; bu da sistem
    // yöneticisi ("Emre Bozar", role: 'admin') hesabını da mentör listesine
    // dahil ediyordu. Artık sadece gerçek mentör/yönetici hesapları
    // (role === 'manager') listeleniyor.
    api.get('/users').then(r => {
      const apiItems: EntityOption[] = (r.data || [])
        .filter((u: any) => u.role === 'manager')
        .map((u: any) => ({ id: u.id, name: u.name }));
      setMentors(mergeEntityOptions(DEFAULT_MENTORS, apiItems));
    }).catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    loadCompanies();
    loadMentors();

    setActiveTab('kisisel');
    if (intern) {
      setForm({
        name: intern.user?.name || '', email: intern.user?.email || '', password: '',
        companyName: intern.company?.name || '', mentorName: intern.mentor?.name || '',
        departmentName: intern.department?.name || '',
        university: intern.university || '', academicDepartment: intern.academicDepartment || '',
        gpa: intern.gpa || '', term: intern.term || '', status: intern.status || 'Aktif',
        startDate: intern.startDate?.split('T')[0] || '', endDate: intern.endDate?.split('T')[0] || '',
        internType: intern.internType || 'Yaz Stajı', workType: intern.workType || 'Tam Zamanlı',
        hybridDays: intern.hybridDays || [],
        tcNo: intern.tcNo || '', birthDate: intern.birthDate || '',
        address: intern.address || '', notes: intern.notes || '', phone: intern.phone || '',
      });
    } else {
      // "Dönem / Staj Yılı" alanı otomatik dolu gelsin (örn. "Yaz 2026") —
      // kullanıcı isterse serbestçe değiştirebilir.
      setForm({ name:'',email:'',password:'', companyName:'',mentorName:'',departmentName:'',
        university:'',academicDepartment:'',gpa:'', term:getDefaultTerm(),status:'Aktif',startDate:'',endDate:'',
        internType:'Yaz Stajı',workType:'Tam Zamanlı',hybridDays:[],
        tcNo:'',birthDate:'',address:'',notes:'',phone:'' });
    }
  }, [open, intern]);

  const toggleDay = (day: string) => setForm(f => ({
    ...f, hybridDays: f.hybridDays.includes(day) ? f.hybridDays.filter(d=>d!==day) : [...f.hybridDays,day],
  }));

  const resolveCompanyId = async (name: string) => {
    if (!name.trim()) return undefined;
    const res = await companiesApi.getAll();
    const found = (res.data || []).find((c: any) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (found) return found.id;
    const created = await companiesApi.findOrCreate(name.trim());
    setCompanies(prev => mergeEntityOptions(DEFAULT_COMPANIES, [
      ...prev.filter(p => p.id).map(p => ({ id: p.id, name: p.name })),
      { id: created.data.id, name: name.trim() },
    ]));
    return created.data.id;
  };

  // Mentör adından e-posta üretirken artık toEmailLocalPart kullanılıyor —
  // bu, Türkçe karakterleri (ğ, ü, ş, ö, ç, ı, İ) SİLMEDEN, @ öncesinde
  // güvenli ve öngörülebilir biçimde korur. Önceki `.toLowerCase()` kullanımı
  // özellikle "İ" harfinde bozuk bir karaktere (i + birleşik nokta) dönüşüme
  // yol açıyordu.
  const resolveMentorId = async (name: string) => {
    if (!name.trim()) return undefined;
    const res = await api.get('/users');
    const all = res.data || [];
    const found = all.find((u: any) => u.name.toLowerCase() === name.trim().toLowerCase());
    if (found) return found.id;
    const email = `${toEmailLocalPart(name)}@mentor.com`;
    const created = await api.post('/users', { name:name.trim(), email, password:'password123', role:'manager' });
    setMentors(prev => mergeEntityOptions(DEFAULT_MENTORS, [
      ...prev.filter(p => p.id).map(p => ({ id: p.id, name: p.name })),
      { id: created.data.id, name: name.trim() },
    ]));
    return created.data.id;
  };

  const resolveDepartmentId = async (name: string) => {
    if (!name.trim()) return undefined;
    const res = await api.get('/departments');
    const found = (res.data || []).find((d: any) => d.name.toLowerCase() === name.trim().toLowerCase());
    if (found) return found.id;
    const created = await api.post('/departments', { name: name.trim() });
    if (!departments.includes(name.trim())) setDepartments(p => [...p, name.trim()]);
    return created.data.id;
  };

  // Firma sil — henüz DB'de karşılığı olmayan (id boş) statik öneriler
  // sadece yerel listeden çıkarılır; gerçek kayıtlar API'den de silinir.
  const deleteCompany = async (opt: EntityOption) => {
    try {
      if (opt.id) await companiesApi.remove(opt.id);
      setCompanies(prev => prev.filter(c => c.name.toLowerCase() !== opt.name.toLowerCase()));
      if (form.companyName.toLowerCase() === opt.name.toLowerCase()) setForm(f => ({ ...f, companyName: '' }));
      toast.success(`"${opt.name}" firma listesinden kaldırıldı.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Firma silinemedi.');
    }
  };

  // Mentör sil — gerçek kullanıcı hesabını da (role: manager) siler.
  const deleteMentor = async (opt: EntityOption) => {
    try {
      if (opt.id) await usersApi.remove(opt.id);
      setMentors(prev => prev.filter(m => m.name.toLowerCase() !== opt.name.toLowerCase()));
      if (form.mentorName.toLowerCase() === opt.name.toLowerCase()) setForm(f => ({ ...f, mentorName: '' }));
      toast.success(`"${opt.name}" mentör listesinden kaldırıldı.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Mentör silinemedi.');
    }
  };

  const handleSubmit = async () => {
    if (!isEdit && (!form.name.trim() || !form.email.trim() || !form.password.trim())) {
      toast.error('Ad soyad, e-posta ve şifre zorunludur.'); return;
    }
    setLoading(true);
    try {
      const companyId    = await resolveCompanyId(form.companyName);
      const mentorId     = await resolveMentorId(form.mentorName);
      const departmentId = await resolveDepartmentId(form.departmentName);

      const internData: any = {
        companyId, departmentId, mentorId, term:form.term, status:form.status,
        startDate:form.startDate||undefined, endDate:form.endDate||undefined,
        phone:form.phone, university:form.university, academicDepartment:form.academicDepartment,
        gpa:form.gpa, internType:form.internType, workType:form.workType,
        hybridDays:form.workType==='Hibrit'?form.hybridDays:[],
        tcNo:form.tcNo, birthDate:form.birthDate, address:form.address, notes:form.notes,
      };

      if (isEdit) {
        // Ad soyad / e-posta / şifre `users` tablosunda durur — intern
        // güncellemesinden AYRI bir PATCH gerekir (önceden hiç yapılmıyordu,
        // bu yüzden bu alanlar düzenlenemiyordu).
        const userId = intern.user?.id || intern.userId;
        if (userId) {
          const userPatch: any = {};
          if (form.name.trim() && form.name.trim() !== intern.user?.name) userPatch.name = form.name.trim();
          if (form.email.trim() && form.email.trim() !== intern.user?.email) userPatch.email = form.email.trim();
          if (form.password.trim()) userPatch.newPassword = form.password.trim();
          if (Object.keys(userPatch).length) await usersApi.update(userId, userPatch);
        }
        await internsApi.update(intern.id, internData);
        toast.success('Stajyer güncellendi.');
      } else {
        const userRes = await api.post('/users',{name:form.name.trim(),email:form.email.trim(),password:form.password,role:'intern'});
        await internsApi.create({ userId:userRes.data.id, ...internData, plainPassword:form.password } as any);
        toast.success('Stajyer eklendi.');
      }
      onSuccess(); onClose();
    } catch (e:any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg)?msg.join(', '):msg||'Bir hata oluştu.');
    } finally { setLoading(false); }
  };

  if (!open) return null;

  const TAB = (t: 'kisisel'|'staj'|'diger', label: string) => (
    <button onClick={() => setActiveTab(t)} style={{
      padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:500, border:'none', background:'none',
      borderBottom: activeTab===t ? '2px solid var(--primary)' : '2px solid transparent',
      color: activeTab===t ? 'var(--primary)' : 'var(--text-secondary)',
    }}>{label}</button>
  );

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:600, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit?'Stajyer Düzenle':'Yeni Stajyer Ekle'}</span>
          <button className="action-btn" onClick={onClose}><Icon name="x" size={18}/></button>
        </div>

        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', padding:'0 24px', gap:4 }}>
          {TAB('kisisel','👤 Kişisel')}
          {TAB('staj','🏢 Staj')}
          {TAB('diger','📋 Diğer')}
        </div>

        <div className="modal-body" style={{ overflowY:'auto', flex:1 }}>
          {activeTab==='kisisel' && (
            <>
              {!isEdit ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ad Soyad *</label>
                      <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-posta *</label>
                      <input className="form-input" type="text" inputMode="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Şifre *</label>
                    <input className="form-input" type="text" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
                    <small style={{color:'var(--text-secondary)',fontSize:11}}>Stajyer bu şifreyle giriş yapacak</small>
                  </div>
                </>
              ) : (
                /* DÜZENLEME MODU: Önceden bu alanlar tamamen gizliydi — ad soyad
                   ve e-posta hiç değiştirilemiyordu. Artık düzenlenebilir;
                   şifre alanı boş bırakılırsa şifre DEĞİŞMEZ, doldurulursa
                   sıfırlanır (min 8 karakter). */
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ad Soyad *</label>
                      <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-posta *</label>
                      <input className="form-input" type="text" inputMode="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yeni Şifre (isteğe bağlı)</label>
                    <input className="form-input" type="text" placeholder="Boş bırakılırsa değişmez"
                      value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
                    <small style={{color:'var(--text-secondary)',fontSize:11}}>Doldurursanız stajyerin şifresi sıfırlanır (en az 8 karakter)</small>
                  </div>
                </>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input className="form-input" placeholder="05xx xxx xxxx" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">TC Kimlik</label>
                  <input className="form-input" value={form.tcNo} onChange={e=>setForm(f=>({...f,tcNo:e.target.value}))}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Doğum Tarihi</label>
                  <input className="form-input" type="date" value={form.birthDate} onChange={e=>setForm(f=>({...f,birthDate:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">GNO</label>
                  <input className="form-input" placeholder="3.50" value={form.gpa} onChange={e=>setForm(f=>({...f,gpa:e.target.value}))}/>
                </div>
              </div>
              <AutocompleteInput label="Üniversite" value={form.university}
                onChange={v=>setForm(f=>({...f,university:v}))} suggestions={TURKISH_UNIVERSITIES}/>
              <AutocompleteInput label="Akademik Bölüm" value={form.academicDepartment}
                onChange={v=>setForm(f=>({...f,academicDepartment:v}))} suggestions={ACADEMIC_DEPARTMENTS}/>
              <div className="form-group">
                <label className="form-label">Adres</label>
                <textarea className="form-textarea" rows={2} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/>
              </div>
            </>
          )}

          {activeTab==='staj' && (
            <>
              <EntityComboBox label="Firma" value={form.companyName}
                onChange={v=>setForm(f=>({...f,companyName:v}))}
                options={companies}
                onAddNew={async (v) => {
                  setForm(f=>({...f,companyName:v}));
                  try {
                    const created = await companiesApi.findOrCreate(v);
                    setCompanies(prev => mergeEntityOptions(DEFAULT_COMPANIES, [
                      ...prev.filter(p=>p.id).map(p=>({id:p.id,name:p.name})),
                      { id: created.data.id, name: v },
                    ]));
                  } catch { /* handleSubmit sırasında zaten tekrar denenir */ }
                }}
                onDelete={deleteCompany}
                placeholder="Firma seçin veya yazın"/>
              <ComboBox label="Departman (Firma İçi Bölüm)" value={form.departmentName}
                onChange={v=>setForm(f=>({...f,departmentName:v}))}
                options={departments}
                onAddNew={async (v) => { setForm(f=>({...f,departmentName:v})); if(!departments.includes(v)) setDepartments(p=>[...p,v]); }}
                placeholder="Departman seçin veya yazın"/>
              <EntityComboBox label="Mentör" value={form.mentorName}
                onChange={v=>setForm(f=>({...f,mentorName:v}))}
                options={mentors}
                onAddNew={async (v) => {
                  setForm(f=>({...f,mentorName:v}));
                  try {
                    const email = `${toEmailLocalPart(v)}@mentor.com`;
                    const created = await api.post('/users', { name:v, email, password:'password123', role:'manager' });
                    setMentors(prev => mergeEntityOptions(DEFAULT_MENTORS, [
                      ...prev.filter(p=>p.id).map(p=>({id:p.id,name:p.name})),
                      { id: created.data.id, name: v },
                    ]));
                  } catch { /* handleSubmit sırasında zaten tekrar denenir */ }
                }}
                onDelete={deleteMentor}
                placeholder="Mentör seçin veya yazın"/>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Dönem / Staj Yılı</label>
                  <input className="form-input" placeholder="2026 Yaz" value={form.term} onChange={e=>setForm(f=>({...f,term:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Durum</label>
                  <select className="form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç</label>
                  <input className="form-input" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Bitiş</label>
                  <input className="form-input" type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Staj Türü</label>
                  <select className="form-select" value={form.internType} onChange={e=>setForm(f=>({...f,internType:e.target.value}))}>
                    {INTERN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Çalışma Şekli</label>
                  <select className="form-select" value={form.workType} onChange={e=>setForm(f=>({...f,workType:e.target.value}))}>
                    {WORK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {form.workType==='Hibrit' && (
                <div className="form-group">
                  <label className="form-label">Hibrit Günler</label>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
                    {WEEK_DAYS.map(day=>(
                      <label key={day} style={{
                        display:'flex',alignItems:'center',gap:6,cursor:'pointer',
                        padding:'6px 12px',borderRadius:6,fontSize:13,fontWeight:500,
                        border:`1px solid ${form.hybridDays.includes(day)?'var(--primary)':'var(--border)'}`,
                        background:form.hybridDays.includes(day)?'var(--primary-light)':'#fff',
                        color:form.hybridDays.includes(day)?'var(--primary)':'var(--text-secondary)',
                      }}>
                        <input type="checkbox" checked={form.hybridDays.includes(day)} onChange={()=>toggleDay(day)} style={{display:'none'}}/>
                        {form.hybridDays.includes(day)?'✓ ':''}{day}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab==='diger' && (
            <div className="form-group">
              <label className="form-label">Notlar</label>
              <textarea className="form-textarea" rows={5} placeholder="Stajyer hakkında notlar..."
                value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div style={{display:'flex',gap:8,flex:1}}>
            {activeTab!=='kisisel'&&<button className="btn-secondary" onClick={()=>setActiveTab(activeTab==='diger'?'staj':'kisisel')}>← Geri</button>}
            {activeTab!=='diger'&&<button className="btn-secondary" onClick={()=>setActiveTab(activeTab==='kisisel'?'staj':'diger')}>İleri →</button>}
          </div>
          <Button variant="secondary" onClick={onClose}>İptal</Button>
          <Button loading={loading} onClick={handleSubmit}>{isEdit?'Güncelle':'Ekle'}</Button>
        </div>
      </div>
    </div>
  );
}