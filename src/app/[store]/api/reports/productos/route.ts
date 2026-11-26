import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { exportProductos, rowsToCsv } from '@/features/recomendaciones/services/reportsService';
import { getCostsEnabled } from '@/lib/store/getCostsEnabled';

/**
 * GET /api/reports/productos
 * Genera y descarga un CSV con el catálogo completo de productos:
 * precio, categoría, subcategoría y stock actual; con el módulo `costos`, también
 * costo y márgenes (#186).
 * Admin only.
 */
export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const rows = await exportProductos(ctx.supabase, ctx.storeId, { costsEnabled: await getCostsEnabled(ctx) });
    const csv = rowsToCsv(rows);
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="productos_${today}.csv"`,
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/reports/productos');
  }
});
