import { NextResponse } from 'next/server';
import { createApiRoute } from '@/lib/api/createApiRoute';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { handleServiceError } from '@/lib/api/handleServiceError';
import { ValidationError } from '@/lib/api/errors';
import { MAX_IMPORT_FILE_BYTES } from '@/features/products/import/parseImportFile';
import { previewImport } from '@/features/products/services/importPreviewService';

/**
 * POST /api/products/import/preview (multipart, campo `file`)
 * Valida la planilla subida y devuelve la vista previa. No crea nada. Admin only.
 */
export const POST = createApiRoute(requireAdmin)(async (ctx) => {
  try {
    const form = await ctx.request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ValidationError('Falta el archivo');
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new ValidationError(
        `El archivo pesa más de ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB: dividilo en partes`
      );
    }
    const preview = await previewImport(ctx.supabase, ctx.storeId, {
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
    });
    return NextResponse.json(preview);
  } catch (error) {
    return handleServiceError(error, 'POST /api/products/import/preview');
  }
});
