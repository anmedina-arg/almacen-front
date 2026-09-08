import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { variedadSchema } from '@/features/products/schemas/familiaSchemas';
import { createVariedad } from '@/features/products/services/familiaService';

/**
 * POST /api/familias/[id]/variedades
 * Crea una variedad bajo la familia indicada. Admin only.
 */
export const POST = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const familiaId = parseInt(id, 10);
    if (isNaN(familiaId)) {
      return NextResponse.json({ error: 'Invalid familia id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    // familia_id siempre viene del segmento de la URL, no del body — evita
    // que un familia_id distinto en el body pise el de la ruta.
    const parsed = variedadSchema.safeParse({ ...body, familia_id: familiaId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const variedad = await createVariedad(ctx.supabase, ctx.storeId, familiaId, parsed.data);
    return NextResponse.json(variedad, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/familias/[id]/variedades');
  }
});
