import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/features/auth/utils/roleHelpers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { stockUpdateSchema } from '@/features/admin/schemas/stockUpdateSchema';

/**
 * PUT /api/stock/[productId]
 * Crea o actualiza el stock de un producto usando la funcion RPC upsert_product_stock.
 * Requiere autenticacion de admin.
 *
 * Body esperado: { p_product_id, p_quantity, p_min_stock, p_notes, p_movement_type }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { isAdmin, error: authError } = await verifyAdminAuth();
    if (!isAdmin) {
      return NextResponse.json(
        { error: authError || 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { productId: productIdParam } = await params;
    const productId = parseInt(productIdParam);
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'ID de producto invalido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validar con Zod schema
    const validation = stockUpdateSchema.safeParse({
      productId,
      quantity: body.p_quantity,
      minStock: body.p_min_stock,
      movementType: body.p_movement_type,
      notes: body.p_notes || '',
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Datos invalidos',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Llamar la funcion RPC upsert_product_stock
    const { data, error } = await supabase.rpc('upsert_product_stock', {
      p_product_id: productId,
      p_quantity: validation.data.quantity,
      p_min_stock: validation.data.minStock,
      p_notes: validation.data.notes || null,
      p_movement_type: validation.data.movementType,
    });

    if (error) {
      console.error('Error upserting stock:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/stock/[productId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
