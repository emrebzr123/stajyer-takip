import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — JWT token ekle
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — 401 → login'e yönlendir
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// ─── Interns ───────────────────────────────────────────────────────────────────
export const internsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/interns', { params }),
  getById: (id: string) => api.get(`/interns/${id}`),
  getStats: () => api.get('/interns/stats'),
  getDeptDistribution: () => api.get('/interns/department-distribution'),
  sendEvaluationForm: (id: string, force = false) =>
    api.post(`/interns/${id}/send-evaluation-form`, { force }),
  create: (data: Record<string, any>) => api.post('/interns', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/interns/${id}`, data),
  remove: (id: string) => api.delete(`/interns/${id}`),
};

// ─── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  getDashboardStats: () => api.get('/tasks/stats/dashboard'),
  getStatusDistribution: () => api.get('/tasks/stats/status-distribution'),
  getCompletionTrend: () => api.get('/tasks/stats/completion-trend'),
  getInternProgress: () => api.get('/tasks/stats/intern-progress'),
  getActivities: (limit?: number) =>
    api.get('/tasks/stats/activities', { params: { limit } }),
  getUpcomingDeadlines: (limit?: number) =>
    api.get('/tasks/stats/upcoming-deadlines', { params: { limit } }),
  create: (data: Record<string, any>) => api.post('/tasks', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/tasks/${id}`, data),
  remove: (id: string) => api.delete(`/tasks/${id}`),
  // Stajyer kendi görevini siler (sahiplik kontrolü backend'de yapılır)
  removeMine: (id: string) => api.delete(`/tasks/my/${id}`),
  getAssignmentMessage: (id: string) => api.get(`/tasks/${id}/assignment-message`),
};

// ─── Weekly Plans ──────────────────────────────────────────────────────────────
export const weeklyPlansApi = {
  getAll: (internId?: string) =>
    api.get('/weekly-plans', { params: internId ? { internId } : {} }),
  create: (data: Record<string, any>) => api.post('/weekly-plans', data),
  update: (id: string, data: Record<string, any>) =>
    api.patch(`/weekly-plans/${id}`, data),
  remove: (id: string) => api.delete(`/weekly-plans/${id}`),
};

// ─── Departments ───────────────────────────────────────────────────────────────
export const departmentsApi = {
  getAll: () => api.get('/departments'),
  create: (name: string) => api.post('/departments', { name }),
};

// ─── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  getSummary: () => api.get('/reports/summary'),
  getPerformance: () => api.get('/reports/performance'),
  getCompletionTrend: () => api.get('/reports/completion-trend'),
  getDepartmentDistribution: () => api.get('/reports/department-distribution'),
};

// ─── Notifications (uygulama içi zil) ──────────────────────────────────────────
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear/read'),
  // Teslim tarihi hatırlatma kontrolünü elle tetikler (test için)
  runDueCheck: () => api.post('/notifications/run-due-check'),
};

// Belge indirme URL'i: API baseURL'i api/v1 prefix'i içerir ama statik
// /uploads servisi prefix'siz sunulur — prefix'i soyarak kök host'u buluruz.
export function fileUrl(docUrl: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1')
    .replace(/\/api\/v1\/?$/, '');
  return `${base}${docUrl}`;
}

// ─── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  getAll: (params?: { internId?: string; taskId?: string }) =>
    api.get('/documents', { params }),
  upload: (file: File, internId?: string, taskId?: string) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { internId, taskId },
    });
  },
  remove: (id: string) => api.delete(`/documents/${id}`),
  // Yönetici: bir belgeyi seçili stajyerlerle ya da tüm stajyerlerle paylaşır.
  share: (file: File, recipientInternIds: string[], shareWithAll: boolean) => {
    const form = new FormData();
    form.append('file', file);
    form.append('recipientInternIds', JSON.stringify(recipientInternIds));
    form.append('shareWithAll', String(shareWithAll));
    return api.post('/documents/share', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Announcements ─────────────────────────────────────────────────────────────
export const announcementsApi = {
  getAll: () => api.get('/announcements'),
  create: (data: Record<string, any>) => api.post('/announcements', data),
  remove: (id: string) => api.delete(`/announcements/${id}`),
};

// ─── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data: Record<string, any>) => api.post('/users', data),
  update: (id: string, data: Record<string, any>) => api.patch(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

export default api;

export const companiesApi = {
  getAll: () => api.get('/companies'),
  findOrCreate: (name: string) => api.post('/companies', { name }),
  remove: (id: string) => api.delete(`/companies/${id}`),
};

export const stajyerTasksApi = {
  getMyTasks: (params?: Record<string,any>) => api.get('/tasks/my', { params }),
  updateStatus: (id: string, status: string, progress?: number) =>
    api.patch(`/tasks/my/${id}/status`, { status, progress }),
  // Tamamlanmış bir görevi stajyerin KENDİ "Görevlerim" ekranından kaldırır.
  // Gerçek silme DEĞİLDİR — görev Haftalık Plan'da ve yönetici tarafında
  // görünmeye devam eder (bkz. backend: hideForIntern).
  hideMine: (id: string) => api.patch(`/tasks/my/${id}/hide`),
};

export const subtasksApi = {
  toggle: (id: string, isCompleted: boolean) => api.patch(`/subtasks/${id}/toggle`, { isCompleted }),
};

export const attendanceApi = {
  checkIn:      () => api.post('/attendance/check-in'),
  checkOut:     () => api.post('/attendance/check-out'),
  history:      (internId?: string) => api.get('/attendance/history', { params: internId ? { internId } : {} }),
  // Şirket geneli devam görünümü (yönetici) — "bugün kim ofiste, kim değil".
  overview:     (date?: string) => api.get('/attendance/overview', { params: date ? { date } : {} }),
};

// "Görevlerim" — yöneticinin kişisel Kanban panosu. Stajyer takip
// sisteminden bağımsızdır; her yönetici SADECE kendi bölümlerini görür
// (backend'de sahiplik kontrolü yapılır).
export const adminTasksApi = {
  getBoards: () => api.get('/admin-tasks/boards'),
  createBoard: (name: string, color?: string) => api.post('/admin-tasks/boards', { name, color }),
  updateBoard: (id: string, data: { name?: string; color?: string; orderIndex?: number }) =>
    api.patch(`/admin-tasks/boards/${id}`, data),
  removeBoard: (id: string) => api.delete(`/admin-tasks/boards/${id}`),
  removeBoards: (ids: string[]) => api.delete('/admin-tasks/boards', { data: { ids } }),
  clearCompleted: (boardId: string) => api.delete(`/admin-tasks/boards/${boardId}/completed`),
  createTask: (boardId: string, data: { title: string; priority?: string; dueDate?: string }) =>
    api.post(`/admin-tasks/boards/${boardId}/tasks`, data),
  updateTask: (id: string, data: { title?: string; priority?: string; dueDate?: string; isCompleted?: boolean }) =>
    api.patch(`/admin-tasks/tasks/${id}`, data),
  removeTask: (id: string) => api.delete(`/admin-tasks/tasks/${id}`),
};

// "Yönetici → Personel" görev sistemi. Stajyer görev sisteminden ve
// yukarıdaki kişisel "Görevlerim" panosundan TAMAMEN bağımsızdır — bu,
// Yönetici'nin bir Personel'e (manager) doğrudan atadığı görevler için.
// "Yönetici → Personel" görev bölümü sistemi — "Görevlerim" (admin-tasks)
// ile birebir aynı yapı, sadece iki taraflı: Yönetici bölüm/görev
// oluşturur-siler, Personel sadece görür ve tamamlandı işaretler.
export const personnelTasksApi = {
  // Yönetici — belirli bir personelin bölümlerini getirir
  getBoardsFor: (assignedToId: string) => api.get('/personnel-tasks/boards', { params: { assignedToId } }),
  // Personel — kendi bölümlerini getirir
  getMyBoards: () => api.get('/personnel-tasks/boards/my'),
  createBoard: (assignedToId: string, name: string, companyId?: string, color?: string) =>
    api.post('/personnel-tasks/boards', { assignedToId, name, companyId, color }),
  updateBoard: (id: string, data: { name?: string; color?: string; orderIndex?: number }) =>
    api.patch(`/personnel-tasks/boards/${id}`, data),
  removeBoard: (id: string) => api.delete(`/personnel-tasks/boards/${id}`),
  removeBoards: (ids: string[]) => api.delete('/personnel-tasks/boards', { data: { ids } }),
  clearCompleted: (boardId: string) => api.delete(`/personnel-tasks/boards/${boardId}/completed`),
  createTask: (boardId: string, data: { title: string; priority?: string; dueDate?: string }) =>
    api.post(`/personnel-tasks/boards/${boardId}/tasks`, data),
  updateTask: (id: string, data: { title?: string; priority?: string; dueDate?: string; isCompleted?: boolean }) =>
    api.patch(`/personnel-tasks/tasks/${id}`, data),
  removeTask: (id: string) => api.delete(`/personnel-tasks/tasks/${id}`),
};
