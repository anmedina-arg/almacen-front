import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Order } from '@/features/admin/types/order.types';

const PAGE_SIZE = 20;

function orderDebe(total: number, payments: { amount: number | null }[]): boolean {
  if (payments.length === 0) return true;
  const withAmount = payments.filter((p) => p.amount !== null);
  if (withAmount.length === 0) return false;
  const paid = withAmount.reduce((acc, p) => acc + (p.amount ?? 0), 0);
  return total - paid > 0;
}

export interface PendingPaymentsResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1));
  const supabase = await createSupabaseServerClient();

  // Query 1 — lightweight: only what's needed to evaluate the DEBE condition
  const { data: lightweight, error: lwErr } = await supabase
    .from('orders')
    .select('id, total, order_payments(amount)')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (lwErr) return NextResponse.json({ error: lwErr.message }, { status: 500 });

  // Filter DEBE in TypeScript (exact same logic as the client)
  const debeIds: number[] = (lightweight ?? [])
    .filter((o) =>
      orderDebe(
        Number(o.total),
        (o.order_payments as { amount: number | null }[] | null) ?? []
      )
    )
    .map((o) => o.id);

  const total = debeIds.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageIds = debeIds.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  if (pageIds.length === 0) {
    return NextResponse.json({ orders: [], total, page: clampedPage, totalPages });
  }

  // Query 2 — full data for this page only
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(unit_cost, unit_price, subtotal, product_name), clients(id, barrio, manzana_lote, display_code), order_payments(id, method, amount)')
    .in('id', pageIds)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  // Preserve original sort order (newest first per debeIds)
  const idOrder = new Map(pageIds.map((id, i) => [id, i]));
  orders.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  return NextResponse.json(
    { orders, total, page: clampedPage, totalPages },
    { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' } }
  );
}
