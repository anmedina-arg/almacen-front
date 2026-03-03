import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { comboService } from '../services/comboService';

export function useComboComponents(productId: number | null) {
  return useQuery({
    queryKey: adminKeys.comboComponents(productId),
    queryFn: () => comboService.getComponents(productId!),
    enabled: !!productId,
  });
}
