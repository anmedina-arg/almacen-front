import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryService } from '../services/categoryService';

export function useCategories() {
  return useQuery({
    queryKey: adminKeys.categoriesList(),
    queryFn: categoryService.getAllWithSubcategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
