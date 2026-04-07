import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RotationItem {
  id: number;
  name: string;
  category_name: string;
  sale_type: string;
  units_sold: number;
  avg_stock: number;
  rotation: number;
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const days = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 7), 365);

  // "Hoy" calculado en hora de Argentina (UTC-3, sin DST).
  // Se resta el offset antes de leer año/mes/día para que medianoche AR
  // no se cuente como el día siguiente en UTC.
  const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowAr = new Date(Date.now() - AR_OFFSET_MS);
  const endUtc = new Date(Date.UTC(nowAr.getUTCFullYear(), nowAr.getUTCMonth(), nowAr.getUTCDate()));
  const startUtc = new Date(endUtc.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const startIso = startUtc.toISOString();
  const startDateStr = startUtc.toISOString().split('T')[0];
  const endDateStr = endUtc.toISOString().split('T')[0];

  const supabase = await createSupabaseServerClient();

  const [salesRes, avgStockRes, productsRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(status, created_at)')
      .filter('orders.status', 'in', '("pending","confirmed")')
      .gte('orders.created_at', startIso)
      .limit(10000),

    supabase.rpc('get_avg_stock_per_product', {
      p_start_date: startDateStr,
      p_end_date: endDateStr,
    }),

    supabase
      .from('products')
      .select('id, name, sale_type, cat:categories!products_category_id_fkey(name)')
      .eq('active', true),
  ]);

  if (salesRes.error || avgStockRes.error || productsRes.error) {
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }

  // Ventas por producto
  const salesMap = new Map<number, number>();
  for (const item of salesRes.data ?? []) {
    if (item.product_id == null) continue;
    salesMap.set(item.product_id, (salesMap.get(item.product_id) ?? 0) + Number(item.quantity));
  }

  // Stock promedio por producto (desde RPC)
  const avgStockMap = new Map<number, number>();
  for (const row of avgStockRes.data ?? []) {
    avgStockMap.set(Number(row.product_id), parseFloat(row.avg_stock));
  }

  const result: RotationItem[] = [];

  for (const product of productsRes.data ?? []) {
    const avg_stock = avgStockMap.get(product.id) ?? 0;
    if (avg_stock === 0) continue;

    const units_sold = salesMap.get(product.id) ?? 0;
    const cat = product.cat as unknown as { name: string } | null;

    result.push({
      id: product.id,
      name: product.name,
      category_name: cat?.name ?? 'Sin categoría',
      sale_type: product.sale_type,
      units_sold,
      avg_stock,
      rotation: units_sold / avg_stock,
    });
  }

  result.sort((a, b) => b.rotation - a.rotation);
  return NextResponse.json(result);
}
