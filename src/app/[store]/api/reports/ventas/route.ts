import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/reports/ventas
 * Genera y descarga un CSV con el detalle de ventas.
 * Params: start_date (ISO), end_date (ISO) — ambos opcionales.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error: authError } = await verifyAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ error: authError || 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate   = searchParams.get('end_date');

  const supabase = await createSupabaseServerClient();

  // Build the query dynamically with optional date filters.
  // Uses a raw SQL query via rpc-like approach — Supabase JS doesn't support
  // complex multi-join queries natively, so we use the PostgREST SQL endpoint.
  const { data, error } = await supabase.rpc('export_ventas', {
    p_start_date: startDate ?? null,
    p_end_date:   endDate   ?? null,
  });

  if (error) {
    console.error('[GET /api/reports/ventas] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Sin datos para el período seleccionado' }, { status: 404 });
  }

  // Build CSV from the result rows
  const rows = data as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Wrap in quotes if contains comma, quote or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');

  const filename = `ventas_${(startDate ?? 'inicio').slice(0, 10)}_a_${(endDate ?? 'hoy').slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
