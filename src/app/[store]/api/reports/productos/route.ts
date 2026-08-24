import { NextRequest, NextResponse } from 'next/server';
import { verifyStoreAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/reports/productos
 * Genera y descarga un CSV con el catálogo completo de productos:
 * costo, precio, márgenes, categoría, subcategoría y stock actual.
 * Admin only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  const { store } = await params;
  const { isStoreAdmin, storeId, error: authError } = await verifyStoreAdminAuth(store);
  if (!isStoreAdmin || storeId == null) {
    return NextResponse.json({ error: authError || 'Forbidden' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('export_productos', { p_store_id: storeId });

  if (error) {
    console.error('[GET /api/reports/productos] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Sin productos para exportar' }, { status: 404 });
  }

  const rows = data as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');

  const today = new Date().toISOString().slice(0, 10);
  const filename = `productos_${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
