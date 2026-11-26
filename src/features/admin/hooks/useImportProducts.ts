import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import type { ConfirmImportOptions } from '@/features/products/import/planImport';
import { importApiClient } from '../services/importApiClient';

/** Confirma la Importación masiva y refresca productos y categorías, que la importación puede haber creado. */
export function useImportProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, options }: { file: File; options: ConfirmImportOptions }) =>
      importApiClient.confirm(file, options),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.categories() });
    },
  });
}
