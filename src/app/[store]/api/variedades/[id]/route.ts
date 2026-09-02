import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { updateVariedadSchema } from '@/features/products/schemas/familiaSchemas';
import { updateVariedad } from '@/features/products/services/familiaService';

/**
 * PUT /api/variedades/[id]
 * Actualiza nombre y/o estado activo (rename y toggle activar/desactivar
 * comparten este mismo endpoint — no hay DELETE acá a propósito, ver AC de
 * #93: "alta/edición/deshabilitación", no "baja"). Admin only.
 */
export const PUT = createApiRoute<{ id: string }>(requireAdmin)(async (ctx, { id }) => {
  try {
    const variedadId = parseInt(id, 10);
    if (isNaN(variedadId)) {
      return NextResponse.json({ error: 'Invalid variedad id' }, { status: 400 });
    }

    const body = await ctx.request.json();
    const parsed = updateVariedadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const variedad = await updateVariedad(ctx.supabase, ctx.storeId, variedadId, parsed.data);
    return NextResponse.json(variedad);
  } catch (error) {
    return handleServiceError(error, 'PUT /api/variedades/[id]');
  }
});
