import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Product } from '@/types';

function formatComboItem(rawName: string, qty: number, saleType: string): string {
  const name = rawName
    .replace(/\b100\s*gr\b/gi, '')
    .replace(/\bkilos?\b/gi, '')
    .replace(/\bkg\b/gi, '')
    .replace(/\bx\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let qtyLabel: string;
  if (saleType === 'kg' || saleType === '100gr') {
    if (qty < 1) {
      qtyLabel = `${Math.round(qty * 1000)} gr`;
    } else {
      qtyLabel = `${parseFloat(qty.toFixed(3))} kg`;
    }
  } else {
    const n = parseFloat(qty.toFixed(10));
    qtyLabel = Number.isInteger(n) ? String(n) : String(parseFloat(n.toPrecision(6)));
  }

  return `${qtyLabel} ${name}`;
}

/**
 * Fetches products with stock and combo items.
 * Server-only — do not import from client components.
 *
 * @param options.includeInactive - When true, returns all products (active + inactive).
 *   The caller is responsible for verifying admin access before passing this flag.
 */
export async function fetchPublicProducts(options?: { includeInactive?: boolean }): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      cost,
      image,
      active,
      categories,
      mainCategory:main_category,
      sale_type,
      is_combo,
      max_stock,
      category_id,
      subcategory_id,
      cat:categories!products_category_id_fkey(id, name),
      sub:subcategories!products_subcategory_id_fkey(id, name)
    `
    )
    .order('name', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  const { data: stockData } = await supabase
    .from('product_stock')
    .select('product_id, quantity');

  const stockMap = new Map<number, number>(
    (stockData ?? []).map((s) => [s.product_id, s.quantity])
  );

  const comboIds = data.filter((p) => p.is_combo).map((p) => p.id);
  const comboItemsMap = new Map<number, string[]>();

  if (comboIds.length > 0) {
    const { data: comboData } = await supabase
      .from('combo_components')
      .select(`combo_product_id, quantity, products!combo_components_component_product_id_fkey(name, sale_type)`)
      .in('combo_product_id', comboIds)
      .order('id', { ascending: true });

    (comboData ?? []).forEach((row) => {
      const prod = row.products as unknown as { name: string; sale_type: string } | null;
      if (!comboItemsMap.has(row.combo_product_id)) comboItemsMap.set(row.combo_product_id, []);
      if (prod) {
        comboItemsMap
          .get(row.combo_product_id)!
          .push(formatComboItem(prod.name, parseFloat(String(row.quantity)), prod.sale_type));
      }
    });
  }

  return data.map((p) => {
    const { cat, sub, ...rest } = p as typeof p & {
      cat?: { id: number; name: string } | null;
      sub?: { id: number; name: string } | null;
    };
    return {
      ...rest,
      category_name: cat?.name ?? null,
      subcategory_name: sub?.name ?? null,
      stock_quantity: stockMap.has(p.id) ? stockMap.get(p.id) : undefined,
      ...(p.is_combo ? { combo_items: comboItemsMap.get(p.id) ?? [] } : {}),
    } as Product;
  });
}
