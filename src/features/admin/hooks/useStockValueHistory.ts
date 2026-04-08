'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import type { StockValueHistoryResponse } from '@/app/api/dashboard/stock-value-history/route';

async function fetchStockValueHistory(): Promise<StockValueHistoryResponse> {
  const res = await fetch('/api/dashboard/stock-value-history', { cache: 'no-store' });
  if (!res.ok) throw new Error('Error al obtener historial de stock valorizado');
  return res.json();
}

export function useStockValueHistory() {
  return useQuery({
    queryKey: adminKeys.dashboardStockValueHistory(),
    queryFn: fetchStockValueHistory,
    staleTime: 5 * 60 * 1000,
  });
}
