import { NextRequest, NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreIdBySlug } from '@/lib/store/getStoreIdBySlug';
import { createOrderSchema } from '@/features/admin/schemas/orderSchemas';

/**
 * POST /api/orders
 * Create a new order. This is a public endpoint (no auth required)
 * because customers create orders when sending WhatsApp messages.
 * Uses the create_order RPC function for transactional insert.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  try {
    const { store } = await params;
    const supabase = await createSupabaseServerClient();
    const storeId = await getStoreIdBySlug(supabase, store);
    if (storeId == null) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      console.error('[POST /api/orders] Zod validation failed:', JSON.stringify({
        errors: validation.error.errors,
        body,
      }, null, 2));
      return NextResponse.json(
        {
          error: firstError?.message || 'Datos invalidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { notes, whatsapp_message, items } = validation.data;

    // Fetch current product price + cost server-side.
    // unit_cost is stored normalized to the same scale as unit_price:
    //   unit_cost = unit_price * (product.cost / product.price)
    // This handles all sale types (unit, 100gr, kg) correctly because
    // the WhatsApp flow normalizes unit_price to price-per-base-unit.
    // .eq('store_id', storeId): un product_id de otra Store no matchea acá,
    // así que productMap.get() cae al mismo fallback (unit_cost 0) que ya
    // existía para un product_id inexistente — sin comportamiento nuevo.
    const productIds = items.map((i) => i.product_id);
    const { data: productsData } = await supabase
      .from('products')
      .select('id, price, cost')
      .eq('store_id', storeId)
      .in('id', productIds);
    const productMap = new Map<number, { price: number; cost: number }>(
      (productsData ?? []).map((p) => [p.id, { price: Number(p.price ?? 0), cost: Number(p.cost ?? 0) }])
    );

    // Call the create_order RPC function (transactional)
    console.log('[POST /api/orders] Calling create_order RPC with items:', JSON.stringify(
      items.map((item) => {
        const prod = productMap.get(item.product_id);
        return { ...item, product_price: prod?.price, product_cost: prod?.cost };
      }), null, 2
    ));
    const { data, error } = await supabase.rpc('create_order', {
      p_user_id: null,
      p_notes: notes || null,
      p_whatsapp_message: whatsapp_message,
      p_items: items.map((item) => {
        const prod = productMap.get(item.product_id);
        const unit_cost = (prod && prod.price > 0)
          ? item.unit_price * (prod.cost / prod.price)
          : 0;
        return {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost,
          is_by_weight: item.is_by_weight,
          from_suggestion: item.from_suggestion ?? false,
        };
      }),
      p_store_id: storeId,
    });

    if (error) {
      // Check if it's an insufficient_stock error from the RPC
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error === 'insufficient_stock') {
          return NextResponse.json(
            { error: 'insufficient_stock', products: parsed.products },
            { status: 409 }
          );
        }
      } catch {
        // Not JSON — fall through to generic error
      }

      console.error('[POST /api/orders] RPC create_order error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Producto Surtido (#95): paso adicional posterior a create_order(), a
    // propósito no forma parte de su cuerpo (#73). Best-effort — la orden
    // ya quedó creada completa arriba; un fallo acá solo se loguea, no
    // rompe la respuesta al cliente. p_selections viaja en el mismo orden
    // que items (sin reordenar/filtrar), que es el mismo orden en el que
    // create_order() insertó los order_items correspondientes.
    const orderId = (data as { order_id?: number } | null)?.order_id;
    if (orderId != null) {
      const { error: variedadesError } = await supabase.rpc('add_order_item_variedades', {
        p_order_id: orderId,
        p_store_id: storeId,
        p_selections: items.map((item) => item.variedades ?? []),
      });
      if (variedadesError) {
        console.error(
          '[POST /api/orders] RPC add_order_item_variedades error (orden ya creada, solo falta el detalle de Variedades):',
          JSON.stringify(variedadesError, null, 2)
        );
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * List all orders. Admin only.
 * Returns orders sorted by creation date (newest first).
 */
export const GET = withStoreAdmin(async (_request, { storeId }) => {
  try {
    const supabase = await createSupabaseServerClient();

    // Fetch orders with their items in one query (same pattern as GET /api/orders/[orderId]).
    // Avoids a separate order_items query + Map lookup that can silently return nothing
    // if the parallel query fails or returns null.
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(unit_cost, unit_price, subtotal, product_name), clients(id, barrio, manzana_lote, display_code), order_payments(id, method, amount)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute margin per order from nested items.
    // Use subtotal * (unit_cost / unit_price) to correctly handle weight-based
    // products where quantity is stored in raw grams but unit_price/unit_cost
    // are per-100gr — avoids the 100x multiplication error.
    const ordersWithMargin = (data ?? []).map((order) => {
      const items: { unit_cost: number; unit_price: number; subtotal: number; product_name: string }[] =
        (order.order_items as unknown as { unit_cost: number; unit_price: number; subtotal: number; product_name: string }[]) ?? [];
      const total_cost = items.reduce((acc, item) => {
        const unitPrice = Number(item.unit_price);
        const itemCost = unitPrice > 0
          ? Number(item.subtotal) * (Number(item.unit_cost) / unitPrice)
          : 0;
        return acc + itemCost;
      }, 0);
      const product_names = items.map((i) => i.product_name).filter(Boolean);
      const { order_items: _items, clients: client, order_payments, ...orderFields } = order;
      const total = Number(orderFields.total);
      const margin = total - total_cost;
      const margin_pct = total > 0 ? (margin / total) * 100 : 0;
      return { ...orderFields, total_cost, margin, margin_pct, client: client ?? null, order_payments: order_payments ?? [], product_names };
    });

    return NextResponse.json(ordersWithMargin, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
