import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { ValidationError } from '@/lib/api/errors';
import { getImportModules } from '@/features/products/import/getImportModules';
import { readImportUpload } from '@/features/products/import/readImportUpload';
import { confirmImport } from '@/features/products/services/importPreviewService';

const optionsSchema = z.object({
  includeDuplicateRows: z.array(z.number().int().positive()).max(500).default([]),
  confirmNewCategories: z.boolean().default(false),
});

/**
 * POST /api/products/import/confirm (multipart: `file` y `options` en JSON)
 * Vuelve a validar el archivo y crea los Productos válidos en una única
 * transacción: todos o ninguno. Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const form = await ctx.request.formData();
    const file = await readImportUpload(form);

    let rawOptions: unknown = {};
    try {
      rawOptions = JSON.parse(String(form.get('options') ?? '{}'));
    } catch {
      throw new ValidationError('Las opciones de la importación no son válidas');
    }
    const options = optionsSchema.safeParse(rawOptions);
    if (!options.success) throw new ValidationError('Las opciones de la importación no son válidas');

    const result = await confirmImport(ctx.supabase, ctx.storeId, file, options.data, await getImportModules(ctx));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error, 'POST /api/products/import/confirm');
  }
});
