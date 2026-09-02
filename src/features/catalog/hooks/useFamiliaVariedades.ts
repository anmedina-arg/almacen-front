'use client';

import { useQuery } from '@tanstack/react-query';
import { familiaApiClient } from '@/features/admin/services/familiaApiClient';
import type { Variedad } from '@/features/admin/types/familia.types';

// Reusa el service de admin (ruta pública, sin admin gate — ver
// familias/route.ts) igual que useOrderSubmit ya reusa orderService.
const catalogKeys = {
  familias: () => ['catalog', 'familias'] as const,
};

export function useFamiliaVariedades(familiaId: number | null | undefined) {
  const query = useQuery({
    queryKey: catalogKeys.familias(),
    queryFn: familiaApiClient.getAllWithVariedades,
    staleTime: 5 * 60 * 1000,
    enabled: familiaId != null,
  });

  const variedades: Variedad[] =
    query.data?.find((f) => f.id === familiaId)?.variedades.filter((v) => v.active) ?? [];

  return { variedades, isLoading: query.isLoading };
}
