'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import {
  buildCalendarWeeks, groupTasksIntoWeeks, internWeekNumber, weekInInternship,
} from '@/lib/weeks';

const STATUS_COLOR: Record<string,string> = {
  'Tamamlandı':'#22C55E','Devam Ediyor':'#F97316',
  'Beklemede':'#9333EA','Planlandı':'#9CA3AF','Gecikmiş':'#EF4444',
};

export default function HaftalikPlanPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [intern, setIntern] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tasks/my?limit=500'),
      user?.internId ? api.get(`/interns/${user.internId}`) : Promise.resolve(null),
    ]).then(([tRes, iRes]) => {
      setTasks(tRes.data.data || []);
      if (iRes) setIntern(iRes.data);
    }).finally(() => setLoading(false));
  }, [user]);

  // ─── GERÇEK TAKVİM EKSENİ ──────────────────────────────────────────────────
  // Önceden bu sayfa, başlangıçtan bitişe kadar TÜM haftaları (staj süresi
  // kadar, en fazla 12) tek seferde üretip yatay kaydırma çubuğuyla
  // gösteriyordu. Uzun süreli (örn. 1 yıllık) biri için bu hem 12 hafta
  // duvarına çarpıyordu hem de "52. hafta"ya kaydırarak ulaşmak pratik
  // değildi. Artık yönetici panelindeki BİREBİR AYNI mantık kullanılıyor:
  // sabit 6 sütunluk bir pencere + ‹ Bugün › okları ile gezinme. Süre ne
  // olursa olsun (2 hafta ya da 2 yıl) arayüz aynı kalır.
  const [weekOffset, setWeekOffset] = useState(-1); // -1 = geçen haftadan başla

  const calendarWeeks = useMemo(() => buildCalendarWeeks(weekOffset, 6), [weekOffset]);
  // clamp=false: takvim artık gezinmeli olduğu için pencere dışı görevler
  // kenetlenmez — ok ile o haftaya gidince zaten görünür.
  const slots = useMemo(() => groupTasksIntoWeeks(tasks, calendarWeeks, false), [tasks, calendarWeeks]);
  const currentWeek = calendarWeeks.find(w => w.isCurrent);

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, margin:'0 0 8px' }}>📅 Haftalık Planım</h1>
      <p style={{ color:'var(--text-secondary)', margin:'0 0 20px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <span>
          {intern?.startDate && <>Başlangıç: <strong>{new Date(intern.startDate).toLocaleDateString('tr-TR')}</strong></>}
          {currentWeek && <> · şu an <strong>{internWeekNumber(intern?.startDate, currentWeek.start) ?? '—'}. çalışma haftanız</strong>dasınız</>}
        </span>
        {/* Hafta gezinme — yönetici panelindeki ‹ Bugün › ile birebir aynı */}
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={() => setWeekOffset(o => o - 1)} title="Önceki hafta"
            style={{ border:'1px solid var(--border)', background:'#fff', borderRadius:6, padding:'4px 8px', cursor:'pointer' }}>‹</button>
          <button onClick={() => setWeekOffset(-1)}
            style={{ border:'1px solid var(--border)', background:'#fff', borderRadius:6, padding:'4px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            Bugün
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} title="Sonraki hafta"
            style={{ border:'1px solid var(--border)', background:'#fff', borderRadius:6, padding:'4px 8px', cursor:'pointer' }}>›</button>
          <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
            {calendarWeeks[0]?.display} → {calendarWeeks[calendarWeeks.length-1]?.display}
          </span>
        </span>
      </p>

      {loading ? <div style={{textAlign:'center',padding:40,color:'var(--text-secondary)'}}>Yükleniyor…</div>
      : (
        <div style={{ overflowX:'auto', minWidth:0, maxWidth:'100%' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {calendarWeeks.map((w,i) => (
                  <th key={i} style={{
                    padding:'12px 8px', fontSize:12, fontWeight:700,
                    color: w.isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                    textAlign:'center', borderBottom:'1px solid var(--border)', minWidth:140,
                    background: w.isCurrent ? '#EFF6FF' : undefined,
                  }}>
                    <div>{w.isCurrent ? '📍 Bu Hafta' : w.display}</div>
                    {w.isCurrent && <div style={{ fontWeight:400, fontSize:11 }}>{w.display}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {calendarWeeks.map((week, wi) => {
                  const inPeriod = weekInInternship(intern?.startDate, intern?.endDate, week);
                  const weekTasks = slots[wi] || [];
                  const wk = internWeekNumber(intern?.startDate, week.start);
                  if (!inPeriod) {
                    return (
                      <td key={wi} style={{ padding:'10px 8px', verticalAlign:'top', borderRight:'1px solid var(--border)', background:'#FAFAFA' }}
                        title="Bu hafta çalışma döneminiz dışında">
                        <div style={{ textAlign:'center', color:'#E5E7EB', fontSize:20 }}>·</div>
                      </td>
                    );
                  }
                  return (
                    <td key={wi} style={{
                      padding:'10px 8px', verticalAlign:'top', borderRight:'1px solid var(--border)',
                      background: week.isCurrent ? '#FAFCFF' : undefined,
                    }}>
                      {wk !== null && (
                        <div style={{ fontSize:9, fontWeight:700, marginBottom:5, color: week.isCurrent ? 'var(--primary)' : '#B0B8C4' }}>
                          {wk}. çalışma haftası
                        </div>
                      )}
                      {weekTasks.length === 0
                        ? <div style={{ textAlign:'center', color:'#D1D5DB', fontSize:20 }}>—</div>
                        : weekTasks.map((t: any, ti: number) => (
                            <div key={ti}
                              title={t.__isFinalWeek === false
                                ? `${t.title} (devam ediyor — teslim: ${new Date(t.dueDate).toLocaleDateString('tr-TR')})`
                                : `Son teslim: ${new Date(t.dueDate).toLocaleDateString('tr-TR')}`}
                              style={{
                                padding:'6px 8px', borderRadius:6, marginBottom:6, fontSize:12, fontWeight:600,
                                background: t.__isFinalWeek === false ? 'transparent' : STATUS_COLOR[t.status]+'20',
                                color: STATUS_COLOR[t.status],
                                border: `1px ${t.__isFinalWeek === false ? 'dashed' : 'solid'} ${STATUS_COLOR[t.status]}40`,
                                opacity: t.__isFinalWeek === false ? 0.65 : 1,
                              }}>
                              {t.title}
                            </div>
                          ))
                      }
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
