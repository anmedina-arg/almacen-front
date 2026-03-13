'use client';

import { useState, useMemo } from 'react';
import type { Order } from '../types/order.types';

export type QuickFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

// Use local time methods — Supabase timestamps are UTC but formatAdminDate
// already converts to local time, so filters must use the same reference.
function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getQuickRange(preset: QuickFilter): { from: string; to: string } {
  const now = new Date();
  const today = toDateString(now);

  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { from: toDateString(from), to: today };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDateString(from), to: today };
    }
    default:
      return { from: '', to: '' };
  }
}

export function useSalesFilters(orders: Order[] | undefined) {
  const [quickFilter, setQuickFilterState] = useState<QuickFilter>('month');
  const initialRange = getQuickRange('month');
  const [dateFrom, setDateFromState] = useState(initialRange.from);
  const [dateTo, setDateToState] = useState(initialRange.to);

  const setQuickFilter = (preset: QuickFilter) => {
    setQuickFilterState(preset);
    if (preset !== 'custom') {
      const range = getQuickRange(preset);
      setDateFromState(range.from);
      setDateToState(range.to);
    }
  };

  const setDateFrom = (value: string) => {
    setDateFromState(value);
    setQuickFilterState('custom');
  };

  const setDateTo = (value: string) => {
    setDateToState(value);
    setQuickFilterState('custom');
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (quickFilter === 'all') return orders;

    return orders.filter((order) => {
      // Convert to local date string so it matches what formatAdminDate displays
      const orderDate = toDateString(new Date(order.created_at));
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    });
  }, [orders, quickFilter, dateFrom, dateTo]);

  return { quickFilter, dateFrom, dateTo, setQuickFilter, setDateFrom, setDateTo, filteredOrders };
}
