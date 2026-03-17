import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import type { PaymentInput } from '../types/payment.types';

async function setPayments(orderId: number, payments: PaymentInput[], orderTotal: number) {
  const res = await fetch(`/api/orders/${orderId}/payments`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payments, order_total: orderTotal }),
  });
  if (!res.ok) {
    const data = await res.json() as { error: string };
    throw new Error(data.error || 'Error al guardar método de pago');
  }
  return res.json();
}

async function deletePayment(orderId: number, paymentId: number) {
  const res = await fetch(`/api/orders/${orderId}/payments/${paymentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json() as { error: string };
    throw new Error(data.error || 'Error al eliminar método de pago');
  }
}

export function useSetOrderPayments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      payments,
      orderTotal,
    }: {
      orderId: number;
      payments: PaymentInput[];
      orderTotal: number;
    }) => setPayments(orderId, payments, orderTotal),
    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ordersList() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.orderPayments(orderId) });
    },
  });
}

export function useDeleteOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentId }: { orderId: number; paymentId: number }) =>
      deletePayment(orderId, paymentId),
    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ordersList() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.orderPayments(orderId) });
    },
  });
}
