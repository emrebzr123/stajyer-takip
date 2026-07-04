// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

export interface Intern {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
  departmentId: string;
  department: Department;
  mentorId: string;
  mentor: Pick<User, 'id' | 'name'>;
  term: string;
  status: InternStatus;
  startDate: string;
  endDate: string;
  progress?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  internId: string;
  intern: Pick<Intern, 'id'> & { name: string; email: string };
  departmentId: string;
  department: Pick<Department, 'id' | 'name'>;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface WeeklyPlanTask {
  id: string;
  title: string;
  status: WeeklyTaskStatus;
  orderIndex: number;
}

export interface WeeklyPlan {
  id: string;
  internId: string;
  intern: Pick<Intern, 'id'> & { name: string; email: string; department: Pick<Department, 'name'> };
  weekNumber: number;
  weekStartDate: string;
  tasks: WeeklyPlanTask[];
  progress: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'green' | 'orange' | 'red';
  message: string;
  internName: string;
  taskTitle?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: Pick<User, 'id' | 'name'>;
  internId?: string;
  taskId?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: Pick<User, 'id' | 'name'>;
  targetRole?: UserRole;
  createdAt: string;
}

// ─── API DTOs ─────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface CreateInternDto {
  name: string;
  email: string;
  departmentId: string;
  mentorId: string;
  term: string;
  startDate: string;
  endDate: string;
  status?: InternStatus;
}

export interface UpdateInternDto extends Partial<CreateInternDto> {}

export interface CreateTaskDto {
  title: string;
  description: string;
  internId: string;
  departmentId: string;
  priority: TaskPriority;
  status?: TaskStatus;
  dueDate: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  progress?: number;
  status?: TaskStatus;
}

export interface CreateWeeklyPlanTaskDto {
  title: string;
  status: WeeklyTaskStatus;
  orderIndex: number;
}

export interface CreateWeeklyPlanDto {
  internId: string;
  weekNumber: number;
  weekStartDate: string;
  tasks: CreateWeeklyPlanTaskDto[];
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ─── Query / Filter Params ────────────────────────────────────────────────────

export interface InternQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  status?: InternStatus;
  term?: string;
}

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  departmentId?: string;
  internId?: string;
}

// ─── Dashboard / Report Types ─────────────────────────────────────────────────

export interface DashboardStats {
  totalInterns: number;
  activeTasks: number;
  completedTasks: number;
  delayedTasks: number;
  averageProgress: number;
  dueSoonTasks: number;
}

export interface TaskStatusDistribution {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface InternProgress {
  internId: string;
  name: string;
  progress: number;
}

export interface DepartmentDistribution {
  departmentId: string;
  name: string;
  count: number;
}

export interface PerformanceReport {
  internId: string;
  name: string;
  completedTasks: number;
  ongoingTasks: number;
  averageProgress: number;
  overdueTasks: number;
  completionRate: number;
}

export interface CompletionTrend {
  date: string;
  value: number;
}

export interface ReportStats {
  totalInterns: number;
  completedTasks: number;
  averageProgress: number;
  overdueTaskCount: number;
  topPerformer: { name: string; progress: number };
}
