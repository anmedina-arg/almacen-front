import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { getImportModules } from '@/features/products/import/getImportModules';
import { readImportUpload } from '@/features/products/import/readImportUpload';
import { previewImport } from '@/features/products/services/importPreviewService';

/**
 * POST /api/products/import/preview (multipart, campo `file`)
 * Valida la planilla subida y devuelve la vista previa. No crea nada. Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const file = await readImportUpload(await ctx.request.formData());
    const preview = await previewImport(ctx.supabase, ctx.storeId, file, await getImportModules(ctx));
    return NextResponse.json(preview);
  } catch (error) {
    return handleServiceError(error, 'POST /api/products/import/preview');
  }
});
