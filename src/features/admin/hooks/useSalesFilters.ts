'use client';

import { useState, useMemo } from 'react';
import type { Order } from '../types/order.types';

export type QuickFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
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
      const orderDate = order.created_at.slice(0, 10); // YYYY-MM-DD
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    });
  }, [orders, quickFilter, dateFrom, dateTo]);

  return { quickFilter, dateFrom, dateTo, setQuickFilter, setDateFrom, setDateTo, filteredOrders };
}
