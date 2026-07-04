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
