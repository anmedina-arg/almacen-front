import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface StockValueDayItem {
  date: string;      // 'YYYY-MM-DD'
  category: string;
  value: number;
}

export interface StockValueHistoryResponse {
  items: StockValueDayItem[];
  categories: string[];  // ordenadas por valor total desc (para asignación consistente de colores)
  dates: string[];       // ordenadas ASC
}

const DAYS = 7;

export async function GET() {
  const { isAdmin } = await verifyAdminAuth();
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fechas en hora Argentina (UTC-3)
  const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowAr = new Date(Date.now() - AR_OFFSET_MS);
  const endUtc = new Date(Date.UTC(nowAr.getUTCFullYear(), nowAr.getUTCMonth(), nowAr.getUTCDate()));
  const startUtc = new Date(endUtc.getTime() - (DAYS - 1) * 24 * 60 * 60 * 1000);

  const startDateStr = startUtc.toISOString().split('T')[0];
  const endDateStr   = endUtc.toISOString().split('T')[0];

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc('get_stock_value_per_day', {
    p_start_date: startDateStr,
    p_end_date:   endDateStr,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as { day_date: string; category_name: string; total_value: number }[];

  // Construir lista de fechas del período (aunque un día no tenga datos)
  const dates: string[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(startUtc.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Categorías ordenadas por valor total acumulado desc
  const categoryTotals = new Map<string, number>();
  for (const row of rows) {
    categoryTotals.set(row.category_name, (categoryTotals.get(row.category_name) ?? 0) + Number(row.total_value));
  }
  const categories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const items: StockValueDayItem[] = rows.map((row) => ({
    date:     row.day_date,
    category: row.category_name,
    value:    Number(row.total_value),
  }));

  return NextResponse.json(
    { items, categories, dates },
    { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' } }
  );
}
