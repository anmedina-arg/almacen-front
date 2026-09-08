import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryApiClient } from '../services/categoryApiClient';

export function useCategories() {
  return useQuery({
    queryKey: adminKeys.categoriesList(),
    queryFn: categoryApiClient.getAllWithSubcategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
