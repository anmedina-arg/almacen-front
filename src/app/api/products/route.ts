import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/types';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Formats a combo component label with quantity always on the left.
// Examples: unit 2 "Pan"       → "2 Pan"
//           kg   0.15 "Carne"  → "150 gr Carne"
//           kg   1.5  "Carne"  → "1.5 kg Carne"
//           100gr 2   "Queso"  → "200 gr Queso"
function formatComboItem(rawName: string, qty: number, saleType: string): string {
  const name = rawName
    .replace(/\b100\s*gr\b/gi, '')
    .replace(/\bkilos?\b/gi, '')
    .replace(/\bkg\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let qtyLabel: string;

  if (saleType === 'kg' || saleType === '100gr') {
    // Quantities in combo_components are always stored in kg regardless of sale_type
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Si includeInactive=true, verificar que sea admin
    if (includeInactive) {
      const { isAdmin } = await verifyAdminAuth();
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
    }

    const supabase = await createSupabaseServerClient();

    // Query 1: productos
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

    // Filtrar solo activos si no es admin o no pidió includeInactive
    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Query 2: stock — query separada para evitar problemas con PostgREST JOIN + RLS
    const { data: stockData } = await supabase
      .from('product_stock')
      .select('product_id, quantity');

    const stockMap = new Map<number, number>(
      (stockData ?? []).map((s) => [s.product_id, s.quantity])
    );

    // Query 3: combo component names — solo para productos combo
    const comboIds = (data ?? []).filter((p) => p.is_combo).map((p) => p.id);
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
          comboItemsMap.get(row.combo_product_id)!.push(
            formatComboItem(prod.name, parseFloat(String(row.quantity)), prod.sale_type)
          );
        }
      });
    }

    const products = (data ?? []).map((p) => {
      const { cat, sub, ...rest } = p as typeof p & { cat?: { id: number; name: string } | null; sub?: { id: number; name: string } | null };
      return {
        ...rest,
        category_name: cat?.name ?? null,
        subcategory_name: sub?.name ?? null,
        stock_quantity: stockMap.has(p.id) ? stockMap.get(p.id) : undefined,
        ...(p.is_combo ? { combo_items: comboItemsMap.get(p.id) ?? [] } : {}),
      };
    });

    // Return with no-cache headers to prevent browser/PWA caching
    return NextResponse.json(products as Product[], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que sea admin
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validar datos básicos
    if (!body.name || body.price == null) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price' },
        { status: 400 }
      );
    }

    // NORMALIZAR mainCategory a minúsculas para que coincida con la constraint
    const normalizedCategory = body.mainCategory ? body.mainCategory.toLowerCase() : 'otros';

    const supabase = await createSupabaseServerClient();

    // Crear producto
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name: body.name,
          price: body.price,
          cost: body.cost ?? 0,
          image: body.image || '',
          main_category: normalizedCategory,
          categories: body.categories || '',
          active: body.active ?? true,
          sale_type: body.sale_type ?? 'unit',
          is_combo: body.is_combo ?? false,
          max_stock: body.max_stock ?? null,
          category_id: body.category_id ?? null,
          subcategory_id: body.subcategory_id ?? null,
        },
      ])
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
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const { cat: insertedCat, sub: insertedSub, ...insertedRest } = data as typeof data & { cat?: { id: number; name: string } | null; sub?: { id: number; name: string } | null };
    const product = {
      ...insertedRest,
      category_name: insertedCat?.name ?? null,
      subcategory_name: insertedSub?.name ?? null,
    };
    return NextResponse.json(product as Product, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
