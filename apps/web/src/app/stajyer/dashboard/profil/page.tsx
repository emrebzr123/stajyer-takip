'use client';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilPage() {
  const { user, setAuth, token } = useAuthStore();
  const [intern, setIntern] = useState<any>(null);
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (user?.internId) {
      api.get(`/interns/${user.internId}`).then(r => setIntern(r.data)).catch(()=>{});
    }
  }, [user]);

  const handlePwdSave = async () => {
    if (!pwd.current || !pwd.next || !pwd.confirm) { toast.error('Tüm alanlar zorunlu.'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Şifreler eşleşmiyor.'); return; }
    if (pwd.next.length < 8) { toast.error('En az 8 karakter.'); return; }
    setPwdLoading(true);
    try {
      await api.patch(`/users/${user?.id}/password`, { currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Şifre güncellendi!');
      setPwd({ current:'', next:'', confirm:'' });
    } catch (e:any) { toast.error(e?.response?.data?.message || 'Güncellenemedi.'); }
    finally { setPwdLoading(false); }
  };

  const rows = [
    { label:'Ad Soyad', value: user?.name },
    { label:'E-posta',  value: user?.email },
    { label:'Üniversite', value: intern?.university },
    { label:'Akademik Bölüm', value: intern?.academicDepartment },
    { label:'Not Ortalaması', value: intern?.gpa },
  ];

  // Ana Sayfa'dan taşınan "Staj Bilgilerim" kartı içeriği: mentör, firma,
  // bölüm, dönem, çalışma şekli, başlangıç/bitiş ve — hibrit çalışılıyorsa —
  // hangi günler ofiste olunduğu.
  const workType   = intern?.workType;
  const hybridDays: string[] = intern?.hybridDays || [];
  const internshipRows = [
    { label: 'Mentör',    value: intern?.mentor?.name },
    { label: 'Firma',     value: intern?.company?.name },
    { label: 'Bölüm',     value: intern?.department?.name || intern?.academicDepartment },
    { label: 'Dönem',     value: intern?.term },
    { label: 'Çalışma',   value: workType },
    { label: 'Başlangıç', value: intern?.startDate },
    { label: 'Bitiş',     value: intern?.endDate },
  ];

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, margin:'0 0 8px' }}>👤 Profilim</h1>
      <p style={{ color:'var(--text-secondary)', margin:'0 0 20px' }}>Kişisel ve akademik bilgileriniz</p>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>Bilgilerim</div>
        {rows.filter(r => r.value).map(r => (
          <div key={r.label} style={{ display:'flex', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ width:160, color:'var(--text-secondary)', fontSize:13, fontWeight:600 }}>{r.label}</div>
            <div style={{ fontWeight:500, fontSize:14 }}>{r.value}</div>
          </div>
        ))}
      </div>

      {/* Staj Bilgilerim — Ana Sayfa'dan buraya taşındı */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>🏢 Staj Bilgilerim</div>
        {internshipRows.filter(r => r.value).map(r => (
          <div key={r.label} style={{ display:'flex', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ width:160, color:'var(--text-secondary)', fontSize:13, fontWeight:600 }}>{r.label}</div>
            <div style={{ fontWeight:500, fontSize:14 }}>{r.value}</div>
          </div>
        ))}
        {/* Hibrit çalışılıyorsa hangi günler ofiste olunduğu net şekilde listelenir */}
        {workType === 'Hibrit' && hybridDays.length > 0 && (
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:13, color:'var(--text-secondary)', fontWeight:600, marginBottom:8 }}>📅 Ofis Günlerim:</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {hybridDays.map((d: string) => (
                <span key={d} style={{
                  padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                  background:'#EFF6FF', color:'#2563EB',
                }}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>🔒 Şifre Değiştir</div>
        {['current','next','confirm'].map((k,i) => (
          <div key={k} className="form-group">
            <label className="form-label">{['Mevcut Şifre','Yeni Şifre','Yeni Şifre (Tekrar)'][i]}</label>
            <input className="form-input" type="password"
              value={pwd[k as keyof typeof pwd]}
              onChange={e => setPwd(p => ({...p,[k]:e.target.value}))} />
          </div>
        ))}
        <button onClick={handlePwdSave} disabled={pwdLoading}
          style={{ padding:'10px 20px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>
          {pwdLoading ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </div>
  );
}
