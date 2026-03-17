import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import type { Client } from '../types/client.types';

async function fetchClients(): Promise<Client[]> {
  const res = await fetch('/api/clients');
  if (!res.ok) throw new Error('Error al cargar clientes');
  return res.json() as Promise<Client[]>;
}

export function useClients() {
  return useQuery({
    queryKey: adminKeys.clientsList(),
    queryFn: fetchClients,
    staleTime: 1000 * 60 * 5, // 5 min — client list rarely changes
  });
}
