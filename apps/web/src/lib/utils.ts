export const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#06B6D4',
];

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const STATUS_MAP: Record<string, string> = {
  Aktif: 'green',
  Mezun: 'blue',
  Pasif: 'orange',
  Ayrıldı: 'red',
  Tamamlandı: 'green',
  'Devam Ediyor': 'orange',
  Beklemede: 'purple',
  Gecikmiş: 'red',
  Planlandı: 'gray',
  Yüksek: 'priority-high',
  Orta: 'priority-medium',
  Düşük: 'priority-low',
};

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function progressColor(status: string): string {
  const map: Record<string, string> = {
    Tamamlandı: '#22C55E',
    'Devam Ediyor': '#F97316',
    Beklemede: '#9333EA',
    Gecikmiş: '#EF4444',
    Planlandı: '#9CA3AF',
  };
  return map[status] || '#3B82F6';
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Mentör/kullanıcı adından otomatik e-posta local-part'ı üretir.
// name.toLowerCase() (locale'siz) Türkçe "İ" (U+0130) harfini "i" + birleşik
// nokta işaretine (U+0307) çevirir ve "I" harfini "ı" yerine "i" yapar —
// bu da bozuk/eksik e-postalara yol açıyordu. toLocaleLowerCase('tr-TR')
// kullanarak Türkçe harfleri (ç, ğ, ı, ö, ş, ü) doğru ve öngörülebilir
// şekilde koruyoruz; sadece boşluk/kesme işareti gibi ayraçları noktaya
// çeviriyoruz, harfleri SİLMİYORUZ.
export function toEmailLocalPart(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/['’]/g, '')
    .replace(/[^a-zçğıöşü0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

// 'YYYY-MM-DD' biçimindeki tarih string'lerini YEREL saat dilimine göre
// (UTC'ye kaydırmadan) ayrıştırır. `new Date('YYYY-MM-DD')` bu string'i
// UTC gece yarısı olarak yorumlar; UTC+3 gibi bir tarayıcıda bu, günün
// aslında 03:00'te başlaması anlamına gelir ve hafta sınırı gibi
// karşılaştırmalarda görevlerin yanlış haftaya düşmesine (ya da hiç
// düşmemesine) neden olur.
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const datePart = dateStr.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Türkiye akademik takvimine kabaca uyan varsayılan "Dönem / Staj Yılı"
// değerini üretir (örn. "Yaz 2026"). Stajyer Ekle formunda kullanıcı hiç
// dokunmadan alan otomatik dolu gelsin diye kullanılır; kullanıcı isterse
// serbestçe değiştirebilir.
export function getDefaultTerm(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  let season: string;
  if (month >= 6 && month <= 8) season = 'Yaz';
  else if (month >= 9 && month <= 11) season = 'Güz';
  else if (month === 12 || month <= 2) season = 'Kış';
  else season = 'Bahar';
  return `${season} ${year}`;
}
