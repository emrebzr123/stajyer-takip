'use client';
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DuyurularPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/announcements').then(r => setAnnouncements(r.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, margin:'0 0 8px' }}>🔔 Duyurular</h1>
      <p style={{ color:'var(--text-secondary)', margin:'0 0 20px' }}>Yöneticilerinizin duyuruları</p>

      {loading ? <div style={{textAlign:'center',padding:40}}>Yükleniyor…</div>
      : announcements.length === 0 ? <div className="card" style={{textAlign:'center',padding:40,color:'var(--text-secondary)'}}>Henüz duyuru yok.</div>
      : announcements.map((a: any) => (
        <div key={a.id} className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <span style={{ fontSize:28 }}>📢</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>{a.title}</div>
              <div style={{ color:'var(--text-secondary)', fontSize:14, lineHeight:1.6 }}>{a.content}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:8 }}>
                {new Date(a.createdAt).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
