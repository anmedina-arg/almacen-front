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
 * Time-weighted average stock over [startDate, endDate].
 * Each stock level is weighted by how long it was held:
 *   avg = SUM(qty_i × duration_i) / total_duration
 *
 * This correctly handles intraday restocks + sales: if 200g were available
 * for 1 day and 2g for 6 days, the average reflects that distribution
 * instead of just the end-of-day snapshot (which would show ~2g).
 */
function calcTimeWeightedAvgStock(
  movements: { new_qty: number; created_at: string }[],
  startDate: Date,
  endDate: Date,
): number {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const periodMs = endMs - startMs;
  if (periodMs <= 0) return 0;

  // Stock level just before the period starts (last movement before startDate)
  let currentQty = 0;
  for (const m of movements) {
    if (new Date(m.created_at).getTime() < startMs) {
      currentQty = Number(m.new_qty);
    } else {
      break;
    }
  }

  let weightedSum = 0;
  let lastTs = startMs;

  for (const m of movements) {
    const ts = new Date(m.created_at).getTime();
    if (ts <= startMs) continue; // before period
    if (ts >= endMs) break;      // after period

    weightedSum += currentQty * (ts - lastTs);
    lastTs = ts;
    currentQty = Number(m.new_qty);
  }

  // Final interval: last known level until end of period
  weightedSum += currentQty * (endMs - lastTs);

  return weightedSum / periodMs;
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

  const [itemsRes, allMovementsRes, productsRes] = await Promise.all([
    // Single query: order_items joined to orders via PostgREST !inner.
    // Filters status and date on the orders side, no two-step ID lookup needed.
    supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(status, created_at)')
      .filter('orders.status', 'in', '("pending","confirmed")')
      .gte('orders.created_at', startIso)
      .limit(100000),

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

  if (itemsRes.error || productsRes.error || allMovementsRes.error) {
    return NextResponse.json({ error: 'Error fetching data' }, { status: 500 });
  }

  const itemsData = itemsRes.data ?? [];
  if (itemsData.length === 0) return NextResponse.json([]);

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
    const avg_stock = calcTimeWeightedAvgStock(movements, startDate, new Date());

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
