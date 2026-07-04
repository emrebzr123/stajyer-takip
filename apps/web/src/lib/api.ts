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
};

// ─── Interns ───────────────────────────────────────────────────────────────────
export const internsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get('/interns', { params }),
  getById: (id: string) => api.get(`/interns/${id}`),
  getStats: () => api.get('/interns/stats'),
  getDeptDistribution: () => api.get('/interns/department-distribution'),
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
};

export default api;

export const companiesApi = {
  getAll: () => api.get('/companies'),
  findOrCreate: (name: string) => api.post('/companies', { name }),
};
