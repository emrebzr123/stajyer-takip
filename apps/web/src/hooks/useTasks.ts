'use client';
import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '@/lib/api';
import { useDebounce } from './useDebounce';

export function useTasks() {
  const [data, setData]       = useState<any[]>([]);
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [priorityFilter, setPriority] = useState('');
  const [deptFilter, setDept]         = useState('');
  const [internFilter, setIntern]     = useState('');

  const debouncedSearch = useDebounce(search, 400);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter)    params.status = statusFilter;
      if (priorityFilter)  params.priority = priorityFilter;
      if (deptFilter)      params.departmentId = deptFilter;
      if (internFilter)    params.internId = internFilter;

      const res = await tasksApi.getAll(params);
      setData(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      setError('Görevler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, priorityFilter, deptFilter, internFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await tasksApi.getDashboardStats();
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const remove = async (id: string) => {
    await tasksApi.remove(id);
    fetchTasks();
    fetchStats();
  };

  return {
    data, stats, loading, error,
    page, setPage, total, totalPages,
    search, setSearch,
    statusFilter, setStatus,
    priorityFilter, setPriority,
    deptFilter, setDept,
    internFilter, setIntern,
    refresh: fetchTasks,
    remove,
  };
}
