import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import {
  buildImportTemplate,
  TEMPLATE_CONTENT_TYPES,
  type TemplateFormat,
} from '@/features/products/import/importTemplate';

/**
 * GET /api/products/import/template?format=xlsx|csv
 * Descarga la Plantilla de importación. Admin only.
 */
export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const format: TemplateFormat =
      new URL(ctx.request.url).searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
    const body = await buildImportTemplate(format);
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
