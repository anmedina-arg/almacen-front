import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { familiaSchema } from '@/features/products/schemas/familiaSchemas';
import { updateFamilia, deleteFamilia } from '@/features/products/services/familiaService';

/**
 * PUT /api/familias/[id]
 * Actualiza el nombre de una familia. Admin only.
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const familiaId = parseInt(id, 10);
    if (isNaN(familiaId)) {
      return NextResponse.json({ error: 'Invalid familia id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const familia = await updateFamilia(ctx.supabase, ctx.storeId, familiaId, parsed.data);
    return NextResponse.json(familia);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/familias/[id]');
  }
});

/**
 * DELETE /api/familias/[id]
 * Las variedades se borran vía ON DELETE CASCADE (#93). Bloquea si algún
 * producto sigue marcado como Producto Surtido de esta Familia
 * (products.familia_id no tiene cascade a propósito). Admin only.
 */
export const DELETE = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const familiaId = parseInt(id, 10);
    if (isNaN(familiaId)) {
      return NextResponse.json({ error: 'Invalid familia id' }, { status: 400 });
    }

    await deleteFamilia(ctx.supabase, ctx.storeId, familiaId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'DELETE /api/familias/[id]');
  }
});
