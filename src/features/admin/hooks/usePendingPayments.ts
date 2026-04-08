'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import type { PendingPaymentsResponse } from '@/app/api/dashboard/pending-payments/route';

async function fetchPendingPayments(page: number): Promise<PendingPaymentsResponse> {
  const res = await fetch(`/api/dashboard/pending-payments?page=${page}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error al obtener pedidos pendientes de pago');
  return res.json();
}

export function usePendingPayments(page: number) {
  return useQuery({
    queryKey: adminKeys.dashboardPendingPayments(page),
    queryFn: () => fetchPendingPayments(page),
    staleTime: 30 * 1000,
  });
}
