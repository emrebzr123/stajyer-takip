'use client';
import { useState, useEffect, useCallback } from 'react';
import { internsApi } from '@/lib/api';
import { useDebounce } from './useDebounce';

export function useInterns() {
  const [data, setData]         = useState<any[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [deptFilter, setDept]       = useState('');
  const [termFilter, setTerm]       = useState('');

  const debouncedSearch = useDebounce(search, 400);

  const fetchInterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter)    params.status = statusFilter;
      if (deptFilter)      params.departmentId = deptFilter;
      if (termFilter)      params.term = termFilter;

      const res = await internsApi.getAll(params);
      setData(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      setError('Stajyerler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, deptFilter, termFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await internsApi.getStats();
      setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchInterns(); }, [fetchInterns]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const remove = async (id: string) => {
    await internsApi.remove(id);
    fetchInterns();
    fetchStats();
  };

  // NOT: Önceden `refresh: fetchInterns` sadece tabloyu yeniliyordu.
  // Bir stajyer düzenlenip (örn. Aktif → Pasif) kaydedildiğinde tablo
  // satırı güncelleniyordu ama üstteki KPI kartları (Toplam/Aktif/Pasif
  // Stajyer) eski değerde donuk kalıyordu, çünkü stats ayrı bir state ve
  // sadece sayfa ilk açıldığında çekiliyordu. Artık ikisi birlikte yenilenir.
  const refresh = () => { fetchInterns(); fetchStats(); };

  return {
    data, stats, loading, error,
    page, setPage, total, totalPages,
    search, setSearch,
    statusFilter, setStatus,
    deptFilter, setDept,
    termFilter, setTerm,
    refresh,
    remove,
  };
}
