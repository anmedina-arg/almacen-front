import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const posOrderItemSchema = z.object({
  product_id: z.number().int().positive(),
  product_name: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  unit_cost: z.number().min(0).default(0),
  is_by_weight: z.boolean().default(false),
});

const posOrderSchema = z.object({
  customer_name: z.string().max(200).optional(),
  items: z.array(posOrderItemSchema).min(1, 'Debe incluir al menos un producto'),
});

/**
 * POST /api/pos/orders
 * Creates an order from the admin Point of Sale panel.
 * Admin only. Uses the same create_order() RPC (transactional + stock decrement).
 * Does not require a WhatsApp message.
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = posOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Datos inválidos' },
        { status: 400 }
      );
    }

    const { customer_name, items } = validation.data;
    const notes = customer_name?.trim() || 'Venta directa';

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('create_order', {
      p_user_id: null,
      p_notes: notes,
      p_whatsapp_message: `[POS] ${notes}`,
      p_items: items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        is_by_weight: item.is_by_weight,
      })),
    });

    if (error) {
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
      console.error('Error creating POS order via RPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/pos/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
