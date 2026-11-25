import { apiFetch, extractErrorMessage } from '@/lib/api/apiFetch';
import type { ImportPreview } from '@/features/products/import/validateImport';

/**
 * Cliente HTTP de la Importación masiva (#182) para Client Components.
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
};
