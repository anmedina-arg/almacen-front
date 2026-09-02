import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { updateComboComponentsSchema } from '@/features/products/schemas/comboSchemas';
import { getComboComponents, updateComboComponents } from '@/features/products/services/comboService';

/**
 * GET /api/combos/[id]/components
 * Admin only.
 */
export const GET = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id: idParam }) => {
  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid combo ID' }, { status: 400 });
    }

    const components = await getComboComponents(ctx.supabase, ctx.storeId, id);
    return NextResponse.json(components);
  } catch (error) {
    return handleServiceError(error, 'GET /api/combos/[id]/components');
  }
});

/**
 * PUT /api/combos/[id]/components
 * Reemplaza todos los componentes del combo. Admin only.
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id: idParam }) => {
  try {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid combo ID' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = updateComboComponentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await updateComboComponents(ctx.supabase, ctx.storeId, id, parsed.data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error, 'PUT /api/combos/[id]/components');
  }
});
