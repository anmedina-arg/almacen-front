'use client';

import type { OrderStatus } from '../../types/order.types';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: 'Pendiente',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  confirmed: {
    label: 'Confirmado',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  cancelled: {
    label: 'Cancelado',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}
