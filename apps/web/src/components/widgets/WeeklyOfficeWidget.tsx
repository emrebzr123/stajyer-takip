'use client';
import React from 'react';
import Avatar from '@/components/ui/Avatar';

const WEEK_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
// JS'in Date.getDay()'i 0=Pazar, 1=Pazartesi... — WEEK_DAYS ile hizalamak
// için bir çeviri tablosu.
const JS_DAY_TO_NAME: Record<number, string> = {
  1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma',
};

// Bir satırın yaklaşık yüksekliği (avatar + isim + gap) — "3 stajyerden
// sonra kaydırmalı olsun" isteği için, tam olarak 3 satır sığacak şekilde
// maxHeight hesaplanıyor.
const ROW_HEIGHT = 34;
const VISIBLE_ROWS = 3;

type AttendanceStatus = 'office' | 'left' | 'absent';

// NOT: Date.toISOString() UTC'ye çeviriyor — Türkiye (UTC+3) saatiyle gece
// yarısına yakın (00:00-02:59 TSİ) çağrılırsa, UTC karşılığı hâlâ BİR
// ÖNCEKİ GÜN olur ve tarih bir gün geriye kayar. Bu da isToday (yerel
// saatle hesaplanan) ile todayIso (eskiden UTC'ydi) arasında tutarsızlığa
// yol açabiliyordu. Bunun yerine yerel tarih bileşenlerinden (yıl/ay/gün)
// elle string üretiyoruz.
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Bu haftanın Pazartesi-Cuma tarihlerini (YYYY-MM-DD) WEEK_DAYS sırasıyla
// hesaplar — bugün hangi gün olursa olsun (hafta sonu dahil) her zaman O
// HAFTANIN Pazartesi'sinden başlar. Sayfa tarafı (Ana Sayfa), her gün için
// Devam Takibi verisini bu tarihlerle çekiyor. NOT: Bu durum göstergesi
// SADECE bu widget içinde kullanılıyor, başka hiçbir yere eklenmedi.
export function getWeekDates(): Record<string, string> {
  const now = new Date();
  const jsDay = now.getDay(); // 0=Pazar
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const result: Record<string, string> = {};
  WEEK_DAYS.forEach((day, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    result[day] = toLocalDateStr(d);
  });
  return result;
}

interface WeeklyOfficeWidgetProps {
  interns: any[];
  // Her gün için GERÇEK Devam Takibi durumu: gün adı -> internId -> durum.
  // Sayfa tarafı, getWeekDates() ile hesaplanan 5 tarih için ayrı ayrı
  // attendanceApi.overview(tarih) çağırıp bu haritayı oluşturuyor. Sadece
  // BUGÜN VE GEÇMİŞ günler için anlamlı veri gelir (henüz yaşanmamış
  // günler için backend zaten kayıt döndürmez, o yüzden gelecek günlerde
  // hiç durum göstergesi göstermiyoruz — aşağıda ayrıca kontrol ediliyor).
  weekStatus?: Record<string, Record<string, AttendanceStatus>>;
}

const STATUS_META: Record<AttendanceStatus, { color: string; label: string }> = {
  office:  { color: '#22C55E', label: 'Ofiste' },
  left:    { color: '#3B82F6', label: 'Çıkış Yaptı' },
  absent:  { color: '#94A3B8', label: 'Giriş Yapmadı' },
};

// Hangi stajyer hangi gün ofiste olacak — planlanan çalışma şeklinden
// (workType + hybridDays) hesaplanan İLERİYE dönük bir program. Her
// stajyerin adının altında artık Ana Görev DEĞİL, o günün GERÇEK Devam
// Takibi durumu gösteriliyor (bugün ve geçmiş günler için).
export default function WeeklyOfficeWidget({ interns, weekStatus }: WeeklyOfficeWidgetProps) {
  const todayName = JS_DAY_TO_NAME[new Date().getDay()];
  const weekDates = getWeekDates();
  const todayIso = toLocalDateStr(new Date());

  const internsForDay = (day: string) =>
    interns.filter((i) => {
      if (i.workType === 'Tam Zamanlı') return true;
      if (i.workType === 'Hibrit') return (i.hybridDays || []).includes(day);
      return false; // Uzaktan — hiçbir gün ofiste değil
    });

  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="card-header">
        <span className="card-title">📅 Haftalık Ofis Takvimi</span>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {WEEK_DAYS.map((day) => {
          const dayInterns = internsForDay(day);
          const isToday = day === todayName;
          const needsScroll = dayInterns.length > VISIBLE_ROWS;
          // Bu gün bugün ya da geçmişte mi — sadece o zaman durum
          // gösteriyoruz, gelecekteki bir gün için "giriş yaptı mı"
          // sorusu henüz anlamsız.
          const isPastOrToday = weekDates[day] <= todayIso;
          return (
            <div key={day} style={{
              flex: '1 1 150px', minWidth: 150, borderRadius: 10, padding: 10,
              background: isToday ? '#EFF6FF' : '#F8FAFC',
              border: isToday ? '1.5px solid #2563EB' : '1px solid var(--border)',
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, marginBottom: 8,
                color: isToday ? '#2563EB' : 'var(--text-primary)',
              }}>
                {day}{isToday && ' (Bugün)'}
              </div>
              {dayInterns.length === 0 ? (
                <div style={{ fontSize: 11, color: '#CBD5E1' }}>Kimse gelmiyor</div>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  maxHeight: needsScroll ? ROW_HEIGHT * VISIBLE_ROWS : undefined,
                  overflowY: needsScroll ? 'auto' : undefined,
                }}>
                  {dayInterns.map((i) => {
                    const status = isPastOrToday ? weekStatus?.[day]?.[i.id] : undefined;
                    const meta = status ? STATUS_META[status] : null;
                    return (
                      <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar name={i.user?.name || '-'} size="sm" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {i.user?.name}
                          </div>
                          {meta && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
