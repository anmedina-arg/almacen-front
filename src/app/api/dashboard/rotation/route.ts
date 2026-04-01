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

/**
 * For each day in [startDate, today], find the last stock snapshot before
 * end-of-day for the given sorted-ASC movements array.
 * Returns 0 if no movement exists before that day (product had no stock).
 */
function calcDailyAvgStock(
  movements: { new_qty: number; created_at: string }[],
  startDate: Date,
  days: number,
): number {
  let total = 0;
  for (let i = 0; i < days; i++) {
    const endOfDay = new Date(startDate);
    endOfDay.setDate(endOfDay.getDate() + i);
    endOfDay.setHours(23, 59, 59, 999);
    const endMs = endOfDay.getTime();

    // Last movement on or before end-of-day (movements sorted ASC)
    let stockOnDay = 0;
    for (const m of movements) {
      if (new Date(m.created_at).getTime() <= endMs) {
        stockOnDay = Number(m.new_qty);
      } else {
        break;
      }
    }
    total += stockOnDay;
  }
  return total / days;
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const days = Math.min(Number(request.nextUrl.searchParams.get('days') ?? 30), 365);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  const startIso = startDate.toISOString();

  const supabase = await createSupabaseServerClient();

  const [ordersRes, allMovementsRes, productsRes] = await Promise.all([
    // Sales in period
    supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'confirmed'])
      .gte('created_at', startIso)
      .limit(10000),

    // ALL historical movements to reconstruct daily stock.
    supabase
      .from('stock_movement_log')
      .select('product_id, new_qty, created_at')
      .order('created_at', { ascending: true })
      .limit(100000),

    supabase
      .from('products')
      .select('id, name, sale_type, cat:categories!products_category_id_fkey(name)')
      .eq('active', true),
  ]);

  if (ordersRes.error || productsRes.error || allMovementsRes.error) {
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }

  const orderIds = (ordersRes.data ?? []).map((o) => o.id);
  if (orderIds.length === 0) return NextResponse.json([]);

  // Parallel batches of 500 order IDs — avoids URL length limits,
  // bypasses PostgREST's 1000-row cap, and runs concurrently.
  const BATCH = 500;
  const batches = [];
  for (let i = 0; i < orderIds.length; i += BATCH) {
    batches.push(
      supabase
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds.slice(i, i + BATCH))
        .limit(10000)
    );
  }
  const batchResults = await Promise.all(batches);
  const itemsData = batchResults.flatMap((r) => r.data ?? []);

  // Sales per product
  const salesMap = new Map<number, number>();
  for (const item of itemsData ?? []) {
    if (item.product_id == null) continue;
    salesMap.set(item.product_id, (salesMap.get(item.product_id) ?? 0) + Number(item.quantity));
  }

  // Group all movements by product_id (already sorted ASC globally)
  const movsByProduct = new Map<number, { new_qty: number; created_at: string }[]>();
  for (const m of allMovementsRes.data ?? []) {
    const arr = movsByProduct.get(m.product_id) ?? [];
    arr.push({ new_qty: Number(m.new_qty), created_at: m.created_at });
    movsByProduct.set(m.product_id, arr);
  }

  const result: RotationItem[] = [];

  for (const product of productsRes.data ?? []) {
    const movements = movsByProduct.get(product.id) ?? [];
    // (stock_day1 + stock_day2 + ... + stock_dayN) / N
    const avg_stock = calcDailyAvgStock(movements, startDate, days);

    // No stock at all → rotation is undefined, skip
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
