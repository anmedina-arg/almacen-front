import { NextResponse } from 'next/server';
import { withStoreAdmin } from '@/features/auth/utils/apiAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateOrderSchema } from '@/features/admin/schemas/orderSchemas';

/**
 * GET /api/orders/[orderId]
 * Get a single order with its items. Admin only.
 */
export const GET = withStoreAdmin<{ orderId: string }>(async (_request, { storeId }, { params }) => {
  try {
    const { orderId: orderIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden invalido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        );
      }
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/orders/[orderId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/orders/[orderId]
 * Permanently delete an order and all its items. Admin only.
 * order_items are removed automatically via ON DELETE CASCADE.
 * Note: stock is NOT restored — handle separately if needed.
 */
export const DELETE = withStoreAdmin<{ orderId: string }>(async (_request, { storeId }, { params }) => {
  try {
    const { orderId: orderIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden invalido' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('store_id', storeId)
      .select('id');

    if (error) {
      console.error('Error deleting order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sin .select() acá, un id de otra Store hubiera devuelto 204 sin
    // borrar nada (0 filas afectadas, sin error) — silencioso.
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/orders/[orderId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/orders/[orderId]
 * Update an order (status, notes). Admin only.
 */
export const PUT = withStoreAdmin<{ orderId: string }>(async (request, { storeId }, { params }) => {
  try {
    const { orderId: orderIdParam } = await params;
    const orderId = parseInt(orderIdParam);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'ID de orden invalido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate with Zod schema
    const validation = updateOrderSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Datos invalidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('orders')
      .update(validation.data)
      .eq('id', orderId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Orden no encontrada' },
          { status: 404 }
        );
      }
      console.error('Error updating order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/orders/[orderId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
