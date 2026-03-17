import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import type { AssignClientInput } from '../types/client.types';

async function assignClient(orderId: number, input: AssignClientInput) {
  const res = await fetch(`/api/orders/${orderId}/client`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json() as { error: string };
    throw new Error(data.error || 'Error al asignar cliente');
  }
  return res.json();
}

async function unassignClient(orderId: number) {
  const res = await fetch(`/api/orders/${orderId}/client`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json() as { error: string };
    throw new Error(data.error || 'Error al quitar cliente');
  }
}

export function useAssignClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: number; input: AssignClientInput }) =>
      assignClient(orderId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ordersList() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.clientsList() });
    },
  });
}

export function useUnassignClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => unassignClient(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ordersList() });
    },
  });
}
