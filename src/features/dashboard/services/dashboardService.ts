import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PendingPaymentsResponse,
  RotationItem,
  StockSnapshotItem,
  StockByCategoryItem,
  StockProductItem,
  StockValueHistoryResponse,
} from '@/features/admin/types/dashboard.types';
import type { Order } from '@/features/admin/types/order.types';
import { calculateLineTotal } from '@/utils/productUtils';
import { getArgentinaTodayUtc } from '@/lib/date/argentinaTime';
import { NotFoundError } from '@/lib/api/errors';

/**
 * Service del dominio Dashboard (#126) — ver ADR-0013, dominio delgado
 * "reporting" sin tabla propia. Conversión kg/100gr y "hoy" en hora
 * Argentina vienen de utils compartidos (calculateLineTotal,
 * getArgentinaTodayUtc) en vez de reimplementarse acá — vivían copiadas,
 * sin variar, en 2 y 3 rutas respectivamente (audit #106).
 */

const PENDING_PAYMENTS_PAGE_SIZE = 20;

function orderDebe(total: number, payments: { amount: number | null }[]): boolean {
  if (payments.length === 0) return true;
  const withAmount = payments.filter((p) => p.amount !== null);
  if (withAmount.length === 0) return false;
  const paid = withAmount.reduce((acc, p) => acc + (p.amount ?? 0), 0);
  return total - paid > 0;
}

export async function getPendingPayments(supabase: SupabaseClient, storeId: number, page: number): Promise<PendingPaymentsResponse> {
  // Query 1 — lightweight: only what's needed to evaluate the DEBE condition.
  // Filtro desde el 20/03/2026 — pedidos anteriores no se muestran en el dashboard.
  const { data: lightweight, error: lwErr } = await supabase
    .from('orders')
    .select('id, total, order_payments(amount)')
    .eq('store_id', storeId)
    .neq('status', 'cancelled')
    .gte('created_at', '2026-03-20T00:00:00.000Z')
    .order('created_at', { ascending: false });

  if (lwErr) throw new Error(lwErr.message);

  const debeIds: number[] = (lightweight ?? [])
    .filter((o) => orderDebe(Number(o.total), (o.order_payments as { amount: number | null }[] | null) ?? []))
    .map((o) => o.id);

  const total = debeIds.length;
  const totalPages = Math.max(1, Math.ceil(total / PENDING_PAYMENTS_PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageIds = debeIds.slice((clampedPage - 1) * PENDING_PAYMENTS_PAGE_SIZE, clampedPage * PENDING_PAYMENTS_PAGE_SIZE);

  if (pageIds.length === 0) {
    return { orders: [], total, page: clampedPage, totalPages };
  }

  // Query 2 — full data for this page only.
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(unit_cost, unit_price, subtotal, product_name), clients(id, barrio, manzana_lote, display_code), order_payments(id, method, amount)')
    .eq('store_id', storeId)
    .in('id', pageIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const orders: Order[] = (data ?? []).map((order) => {
    const items = (order.order_items as { unit_cost: number; unit_price: number; subtotal: number; product_name: string }[]) ?? [];
    const total_cost = items.reduce((acc, item) => {
      const unitPrice = Number(item.unit_price);
      return acc + (unitPrice > 0 ? Number(item.subtotal) * (Number(item.unit_cost) / unitPrice) : 0);
    }, 0);
    const product_names = items.map((i) => i.product_name).filter(Boolean);
    const { order_items: _items, clients: client, order_payments, ...orderFields } = order;
    const orderTotal = Number(orderFields.total);
    const margin = orderTotal - total_cost;
    const margin_pct = orderTotal > 0 ? (margin / orderTotal) * 100 : 0;
    return { ...orderFields, total_cost, margin, margin_pct, client: client ?? null, order_payments: order_payments ?? [], product_names };
  });

  // Preserve original sort order (newest first per debeIds).
  const idOrder = new Map(pageIds.map((id, i) => [id, i]));
  orders.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  return { orders, total, page: clampedPage, totalPages };
}

export async function getRotation(supabase: SupabaseClient, storeId: number, days: number): Promise<RotationItem[]> {
  const endUtc = getArgentinaTodayUtc();
  const startUtc = new Date(endUtc.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startIso = startUtc.toISOString();
  const startDateStr = startUtc.toISOString().split('T')[0];
  const endDateStr = endUtc.toISOString().split('T')[0];

  const [salesRes, avgStockRes, productsRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(status, created_at, store_id)')
      .filter('orders.status', 'in', '("pending","confirmed")')
      .eq('orders.store_id', storeId)
      .gte('orders.created_at', startIso)
      .limit(10000),

    supabase.rpc('get_avg_stock_per_product', { p_store_id: storeId, p_start_date: startDateStr, p_end_date: endDateStr }),

    supabase.from('products').select('id, name, sale_type, cat:categories!products_category_id_fkey(name)').eq('active', true).eq('store_id', storeId),
  ]);

  if (salesRes.error || avgStockRes.error || productsRes.error) {
    throw new Error('Error fetching data');
  }

  const salesMap = new Map<number, number>();
  for (const item of salesRes.data ?? []) {
    if (item.product_id == null) continue;
    salesMap.set(item.product_id, (salesMap.get(item.product_id) ?? 0) + Number(item.quantity));
  }

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
  return result;
}

export async function getRotationSnapshots(supabase: SupabaseClient, storeId: number, productId: number): Promise<StockSnapshotItem[]> {
  // stock_movement_log.store_id queda siempre NULL para filas viejas (gap
  // #52, ya resuelto para inserts nuevos desde 2026-08-24) — se verifica
  // que el producto pertenezca a esta Store antes de leer su historial,
  // mismo criterio que upsert_product_stock.sql (Stock #17), en vez de
  // depender solo de esa columna para filas históricas.
  const { data: product, error: productError } = await supabase.from('products').select('id').eq('id', productId).eq('store_id', storeId).maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!product) throw new NotFoundError('Product not found in this store');

  const DAYS = 7;
  const todayUtc = getArgentinaTodayUtc();
  const snapshots: StockSnapshotItem[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const dayUtc = new Date(todayUtc.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = dayUtc.toISOString().split('T')[0];

    if (i === 0) {
      // Hoy: fuente de verdad = product_stock.
      const { data } = await supabase.from('product_stock').select('quantity').eq('product_id', productId).single();
      snapshots.push({ date: dateStr, stock: data ? Number(data.quantity) : null, movement_type: 'actual' });
    } else {
      // Días anteriores: último movimiento antes del cierre del día.
      const endOfDay = new Date(dayUtc.getTime() + 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from('stock_movement_log')
        .select('new_qty, movement_type')
        .eq('product_id', productId)
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      snapshots.push({
        date: dateStr,
        stock: data && data.length > 0 ? Number(data[0].new_qty) : null,
        movement_type: data && data.length > 0 ? data[0].movement_type : null,
      });
    }
  }

  return snapshots;
}

export async function getStockByCategory(supabase: SupabaseClient, storeId: number): Promise<StockByCategoryItem[]> {
  // products tiene una policy de lectura pública sin restricción de Store
  // (catálogo público) — el filtro por store_id acá tiene que ser explícito
  // en la query, RLS por sí sola no aisla esta tabla para un contexto
  // admin. product_stock se sigue trayendo sin filtrar (igual que antes):
  // el stockMap de abajo solo se consulta con ids de `products`, que ya
  // vienen filtrados, y filtrar product_stock.store_id directamente
  // ocultaría stock legacy cuyo store_id todavía no se backfilleó (mismo
  // motivo documentado en get_all_products_with_stock.sql, Stock #17).
  const [{ data: products, error: productsError }, { data: stockData }] = await Promise.all([
    supabase.from('products').select('id, cost, sale_type, cat:categories!products_category_id_fkey(name)').eq('active', true).eq('store_id', storeId),
    supabase.from('product_stock').select('product_id, quantity'),
  ]);

  if (productsError || !products) throw new Error('Error fetching products');

  const stockMap = new Map<number, number>((stockData ?? []).map((s) => [s.product_id, s.quantity]));
  const totals = new Map<string, number>();

  for (const product of products) {
    const cat = product.cat as unknown as { name: string } | null;
    const categoryName = cat?.name ?? 'Sin categoría';
    const stockGrams = stockMap.get(product.id) ?? 0;
    const cost = product.cost ?? 0;
    const value = calculateLineTotal(stockGrams, product.sale_type, cost);
    totals.set(categoryName, (totals.get(categoryName) ?? 0) + value);
  }

  return Array.from(totals.entries())
    .map(([category_name, total_value]) => ({ category_name, total_value: Math.round(total_value) }))
    .filter((item) => item.total_value > 0)
    .sort((a, b) => b.total_value - a.total_value);
}

export async function getStockProducts(supabase: SupabaseClient, storeId: number, category: string): Promise<StockProductItem[]> {
  // Mismo criterio que getStockByCategory: products filtrado explícitamente
  // por store_id (lectura pública sin restricción de Store), product_stock
  // sin filtrar (evita ocultar stock legacy no backfilleado — ver
  // get_all_products_with_stock.sql, Stock #17).
  const [{ data: products, error }, { data: stockData }] = await Promise.all([
    supabase.from('products').select('id, name, cost, sale_type, cat:categories!products_category_id_fkey(name)').eq('active', true).eq('store_id', storeId),
    supabase.from('product_stock').select('product_id, quantity'),
  ]);

  if (error || !products) throw new Error('Error fetching products');

  const stockMap = new Map<number, number>((stockData ?? []).map((s) => [s.product_id, s.quantity]));

  return products
    .filter((p) => {
      const cat = p.cat as unknown as { name: string } | null;
      return (cat?.name ?? 'Sin categoría') === category;
    })
    .map((p) => {
      const stock_raw = stockMap.get(p.id) ?? 0;
      const cost = p.cost ?? 0;
      const stock_value = calculateLineTotal(stock_raw, p.sale_type, cost);
      return { id: p.id, name: p.name, sale_type: p.sale_type, stock_raw, cost, stock_value: Math.round(stock_value) };
    })
    .filter((p) => p.stock_raw > 0)
    .sort((a, b) => b.stock_value - a.stock_value);
}

export async function getStockValueHistory(supabase: SupabaseClient, storeId: number): Promise<StockValueHistoryResponse> {
  const DAYS = 7;
  const endUtc = getArgentinaTodayUtc();
  const startUtc = new Date(endUtc.getTime() - (DAYS - 1) * 24 * 60 * 60 * 1000);
  const startDateStr = startUtc.toISOString().split('T')[0];
  const endDateStr = endUtc.toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('get_stock_value_per_day', { p_store_id: storeId, p_start_date: startDateStr, p_end_date: endDateStr });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { day_date: string; category_name: string; total_value: number }[];

  const dates: string[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(startUtc.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }

  const categoryTotals = new Map<string, number>();
  for (const row of rows) {
    categoryTotals.set(row.category_name, (categoryTotals.get(row.category_name) ?? 0) + Number(row.total_value));
  }
  const categories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

  const items = rows.map((row) => ({ date: row.day_date, category: row.category_name, value: Number(row.total_value) }));

  return { items, categories, dates };
}
