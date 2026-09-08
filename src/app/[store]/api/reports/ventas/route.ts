import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { exportVentas, rowsToCsv } from '@/features/recomendaciones/services/reportsService';

/**
 * GET /api/reports/ventas
 * Genera y descarga un CSV con el detalle de ventas.
 * Params: start_date (ISO), end_date (ISO) — ambos opcionales.
 * Admin only.
 */
export const GET = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const rows = await exportVentas(ctx.supabase, ctx.storeId, { startDate, endDate });
    const csv = rowsToCsv(rows);
    const filename = `ventas_${(startDate ?? 'inicio').slice(0, 10)}_a_${(endDate ?? 'hoy').slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleServiceError(error, 'GET /api/reports/ventas');
  }
});
