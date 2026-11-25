import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getImportModules } from '@/features/products/import/getImportModules';
import {
  buildImportTemplate,
  TEMPLATE_CONTENT_TYPES,
  type TemplateFormat,
} from '@/features/products/import/importTemplate';

/**
 * GET /api/products/import/template?format=xlsx|csv
 * Descarga la Plantilla de importación de la Store: suma `costo` con el módulo `costos` y
 * `stock_inicial` con el módulo `stock` (#188). Admin only.
 */
export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const format: TemplateFormat =
      new URL(ctx.request.url).searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
    const body = await buildImportTemplate(format, await getImportModules(ctx));
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': TEMPLATE_CONTENT_TYPES[format],
        'Content-Disposition': `attachment; filename="plantilla-productos.${format}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/products/import/template');
  }
});
