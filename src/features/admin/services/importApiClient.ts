import { apiFetch, extractErrorMessage } from '@/lib/api/apiFetch';
import type { ImportPreview } from '@/features/products/import/validateImport';
import type { ConfirmImportOptions } from '@/features/products/import/planImport';
import type { ImportResult } from '@/features/products/services/importPreviewService';

/**
 * Cliente HTTP de la Importación masiva (#182, #185) para Client Components.
 * La descarga de la Plantilla no pasa por acá: es un link directo a
 * /api/products/import/template.
 */
export const importApiClient = {
  async preview(file: File): Promise<ImportPreview> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch('/products/import/preview', { method: 'POST', body: form });
    const body = await res.json().catch(() => undefined);
    if (!res.ok) throw new Error(extractErrorMessage(body, 'No se pudo leer el archivo'));
    return body as ImportPreview;
  },

  /** Vuelve a mandar el archivo: el servidor lo revalida, no confía en la vista previa del cliente. */
  async confirm(file: File, options: ConfirmImportOptions): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('options', JSON.stringify(options));
    const res = await apiFetch('/products/import/confirm', { method: 'POST', body: form });
    const body = await res.json().catch(() => undefined);
    if (!res.ok) throw new Error(extractErrorMessage(body, 'No se pudieron crear los productos'));
    return body as ImportResult;
  },
};
