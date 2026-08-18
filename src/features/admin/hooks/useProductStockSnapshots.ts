'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/apiFetch';
import { adminKeys } from '../constants/queryKeys';
import type { StockSnapshotItem } from '@/app/[store]/api/dashboard/rotation/snapshots/route';

async function fetchSnapshots(productId: number): Promise<StockSnapshotItem[]> {
  const res = await apiFetch(`/dashboard/rotation/snapshots?product_id=${productId}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Error al obtener snapshots de stock');
  return res.json();
}

export function useProductStockSnapshots(productId: number | null) {
  return useQuery({
    queryKey: adminKeys.dashboardRotationSnapshots(productId ?? 0),
    queryFn: () => fetchSnapshots(productId!),
    enabled: productId !== null,
    staleTime: 2 * 60 * 1000,
  });
}
