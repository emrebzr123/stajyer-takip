// ─────────────────────────────────────────────────────────────────────────────
// HAFTA SENKRONİZASYONU — TEK DOĞRULUK KAYNAĞI
//
// Önceki sorun: Yönetici paneli hafta miladını "sistemdeki en eski görev"den,
// stajyer paneli ise "o stajyerin kendi en eski görevi"nden alıyordu. Aynı
// görev iki panelde FARKLI hafta numarasında görünüyordu; üstelik "1. Hafta"
// hiçbir şeyin gerçek 1. haftası değildi.
//
// Yeni model: HER STAJYERİN KENDİ STAJ BAŞLANGICI (startDate) miladıdır.
//   • "1. Hafta" = stajyerin başladığı tarihi içeren haftanın Pazartesi'si.
//   • Hafta sayısı staj süresinden türetilir (başlangıç→bitiş), yoksa 6.
//   • Bugün başlayan A stajyeri ile 15 gün sonra başlayacak B stajyeri
//     bağımsız takvimlere sahiptir: A için "3. Hafta" ile B için "3. Hafta"
//     farklı gerçek tarihlere denk gelir — bu DOĞRUDUR, çünkü herkesin
//     "stajının 3. haftası" kendine göredir.
//   • Yönetici tablosu ve stajyer paneli AYNI fonksiyonu kullandığı için
//     bir görev iki panelde her zaman aynı hafta numarasında görünür.
//
// Milat önceliği: startDate → (yoksa) stajyerin en eski görev tarihi →
// (o da yoksa) bugün. startDate girilmiş stajyerlerde takvim, görevler
// eklenip silindikçe ASLA kaymaz (kalıcı milat).
// ─────────────────────────────────────────────────────────────────────────────
import { parseLocalDate } from './utils';

export interface WeekDef {
  week: number;      // 1'den başlar
  label: string;     // "1. Hafta"
  start: Date;       // Pazartesi 00:00 (yerel)
  end: Date;         // Cuma 23:59:59.999 (yerel)
  display: string;   // "06 Tem – 10 Tem"
  isCurrent: boolean;
}

const MIN_WEEKS = 4;
const MAX_WEEKS = 12;
const DEFAULT_WEEKS = 6;

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function fmt(d: Date): string {
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

// Görevin hafta yerleşiminde kullanılacak referans tarihi
export function getTaskRefDate(task: any): Date {
  return parseLocalDate(task.taskStartDate || task.dueDate);
}

// Bir stajyer için hafta matrisini üretir.
export function buildInternWeeks(params: {
  startDate?: string | null;   // stajyerin staj başlangıcı (milat)
  endDate?: string | null;     // staj bitişi (hafta sayısını belirler)
  taskDates?: Date[];          // startDate yoksa yedek milat için
}): WeekDef[] {
  const { startDate, endDate, taskDates } = params;

  // 1) Miladı belirle
  let anchor: Date | null = null;
  if (startDate) {
    const d = parseLocalDate(startDate);
    if (!isNaN(d.getTime())) anchor = d;
  }
  if (!anchor && taskDates?.length) {
    const valid = taskDates.filter((d) => !isNaN(d.getTime()));
    if (valid.length) anchor = valid.reduce((m, d) => (d < m ? d : m), valid[0]);
  }
  if (!anchor) anchor = new Date();

  const monday = getMondayOf(anchor);

  // 2) Hafta sayısını belirle: bitiş tarihi varsa süreden türet, yoksa 6
  let count = DEFAULT_WEEKS;
  if (endDate) {
    const end = parseLocalDate(endDate);
    if (!isNaN(end.getTime()) && end >= monday) {
      const days = Math.floor((end.getTime() - monday.getTime()) / 86400000) + 1;
      count = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.ceil(days / 7)));
    }
  }

  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(monday, i * 7);
    const end = endOfDay(addDays(start, 4)); // Pzt + 4 = Cuma, günün SONU
    return {
      week: i + 1,
      label: `${i + 1}. Hafta`,
      start,
      end,
      display: `${fmt(start)} – ${fmt(addDays(start, 4))}`,
      isCurrent: now >= start && now <= endOfDay(addDays(start, 6)), // hafta sonu dahil
    };
  });
}

// Görevleri haftalara dağıtır — ÇOK HAFTALIK GÖREVLER GANTT ŞERİDİ GİBİ
// YAYILIR. Önceden bir görev sadece TEK bir haftaya (son tarihine göre)
// yerleştiriliyordu; 2 haftalık bir görev verildiğinde 1. hafta boş
// görünüyor, görev sadece 2. haftada beliriyordu. Artık taskStartDate
// girilmişse görev, başlangıç haftasından bitiş haftasına kadar HER
// haftanın hücresinde görünür (son haftadaki görünüm normal, önceki
// haftalardaki görünüm "devam ediyor" anlamına gelsin diye soluk/kesikli
// çerçeveli olur — bkz. çağıran taraftaki __isFinalWeek kullanımı).
//
// taskStartDate girilmemiş (eski) görevlerde rangeStart = rangeEnd = dueDate
// olur, yani görev tek bir haftada görünür — ESKİ DAVRANIŞLA BİREBİR AYNI,
// geriye dönük hiçbir kırılma olmaz.
//
// clamp=true  (eski/tek-panel model): pencere DIŞINDA kalan görevler
//   kaybolmaz — ilk/son haftaya kenetlenir.
// clamp=false (takvim ekseni gezinmeli görünüm — hem yönetici hem artık
//   stajyer paneli): pencere dışındaki görevler o an gösterilmez, oklarla
//   kaydırılınca kendi gerçek haftalarında görünür.
export function groupTasksIntoWeeks(tasks: any[], weeks: WeekDef[], clamp = true): any[][] {
  const slots: any[][] = weeks.map(() => []);
  if (!weeks.length) return slots;

  for (const task of tasks) {
    const dueRef = parseLocalDate(task.dueDate);
    if (isNaN(dueRef.getTime())) continue;

    let startRef = task.taskStartDate ? parseLocalDate(task.taskStartDate) : dueRef;
    // Güvenlik: başlangıç bitişten sonraysa (veri hatası) tek noktaya düş
    if (isNaN(startRef.getTime()) || startRef > dueRef) startRef = dueRef;

    let matchedAny = false;
    weeks.forEach((w, idx) => {
      // Hafta bloğunu Pazartesi–Pazar (hafta sonu dahil) olarak değerlendir
      // ki hafta sonuna denk gelen başlangıç/bitiş tarihleri kaybolmasın.
      const weekFullEnd = endOfDay(addDays(w.start, 6));
      const overlaps = startRef <= weekFullEnd && dueRef >= w.start;
      if (overlaps) {
        const isFinalWeek = dueRef >= w.start && dueRef <= weekFullEnd;
        slots[idx].push({ ...task, __isFinalWeek: isFinalWeek });
        matchedAny = true;
      }
    });

    if (!matchedAny && clamp) {
      const idx = dueRef < weeks[0].start ? 0 : weeks.length - 1;
      slots[idx].push({ ...task, __isFinalWeek: true });
    }
  }
  return slots;
}

// ── Yönetici takvim görünümü yardımcıları ──────────────────────────────────
// Yönetici tablosu GERÇEK takvim ekseni kullanır: tüm satırlar aynı sütun
// tarihlerini paylaşır ("bu hafta" sütunu herkes için aynıdır). Stajyerin
// KENDİ hafta numarası ise hücre içinde rozet olarak gösterilir — böylece
// stajyer panelindeki "N. Hafta" numarasıyla senkron korunur (ikisi de aynı
// startDate miladından türetilir).

// Bugünü içeren haftanın Pazartesi'sinden offset hafta kaydırılmış,
// `count` haftalık gerçek takvim penceresi üretir.
export function buildCalendarWeeks(offsetWeeks: number, count = 6): WeekDef[] {
  const baseMonday = getMondayOf(new Date());
  const first = addDays(baseMonday, offsetWeeks * 7);
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(first, i * 7);
    const end = endOfDay(addDays(start, 4));
    return {
      week: i + 1,
      label: `${fmt(start)} – ${fmt(addDays(start, 4))}`,
      start,
      end,
      display: `${fmt(start)} – ${fmt(addDays(start, 4))}`,
      isCurrent: now >= start && now <= endOfDay(addDays(start, 6)),
    };
  });
}

// Verilen takvim haftası, stajyerin stajının kaçıncı haftasına denk geliyor?
// (startDate girilmemişse veya hafta stajdan önceyse null)
export function internWeekNumber(startDate: string | null | undefined, weekStart: Date): number | null {
  if (!startDate) return null;
  const anchor = getMondayOf(parseLocalDate(startDate));
  if (isNaN(anchor.getTime())) return null;
  const n = Math.round((weekStart.getTime() - anchor.getTime()) / (7 * 86400000)) + 1;
  return n >= 1 ? n : null;
}

// Takvim haftası stajyerin staj dönemi içinde mi? (hücre gri/aktif ayrımı)
export function weekInInternship(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  week: WeekDef,
): boolean {
  if (startDate) {
    const s = parseLocalDate(startDate);
    if (!isNaN(s.getTime()) && week.end < s) return false;
  }
  if (endDate) {
    const e = endOfDay(parseLocalDate(endDate));
    if (!isNaN(e.getTime()) && week.start > e) return false;
  }
  return true;
}
