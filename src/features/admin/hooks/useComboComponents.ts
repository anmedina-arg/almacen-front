import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { comboApiClient } from '../services/comboApiClient';

export function useComboComponents(productId: number | null) {
  return useQuery({
    queryKey: adminKeys.comboComponents(productId),
    queryFn: () => comboApiClient.getComponents(productId!),
    enabled: !!productId,
  });
}
