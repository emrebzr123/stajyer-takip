// Shared types — @intern-tracker/shared yerine kullanılır
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  INTERN = 'intern',
}

export enum InternStatus {
  ACTIVE = 'Aktif',
  GRADUATED = 'Mezun',
  PASSIVE = 'Pasif',
  LEFT = 'Ayrıldı',
}

export enum TaskStatus {
  PLANNED = 'Planlandı',
  IN_PROGRESS = 'Devam Ediyor',
  ON_HOLD = 'Beklemede',
  COMPLETED = 'Tamamlandı',
  DELAYED = 'Gecikmiş',
}

export enum TaskPriority {
  HIGH = 'Yüksek',
  MEDIUM = 'Orta',
  LOW = 'Düşük',
}

export enum WeeklyTaskStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'on-hold',
  PLANNED = 'planned',
  DELAYED = 'delayed',
}
