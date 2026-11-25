import type { SupabaseClient } from '@supabase/supabase-js';
import { parseImportFile } from '../import/parseImportFile';
import { validateImport, type ImportContext, type ImportPreview } from '../import/validateImport';

const PAGE_SIZE = 1000;

/**
 * Contexto de la Store para validar: nombres de producto existentes (activos
 * e inactivos, para detectar duplicados) y sus categorías con subcategorías.
 */
async function loadImportContext(supabase: SupabaseClient, storeId: number): Promise<ImportContext> {
  const existingProductNames: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select('name')
      .eq('store_id', storeId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    existingProductNames.push(...(data ?? []).map((p) => p.name as string));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  const { data: categories, error } = await supabase
    .from('categories')
    .select('name, subcategories(name)')
    .eq('store_id', storeId);
  if (error) throw new Error(error.message);

  return {
    existingProductNames,
    categories: (categories ?? []).map((c) => ({
      name: c.name as string,
      subcategories: ((c.subcategories ?? []) as { name: string }[]).map((s) => s.name),
    })),
  };
}

/** Importación masiva, primera mitad (#182): lee el archivo y arma la vista previa. No escribe nada. */
export async function previewImport(
  supabase: SupabaseClient,
  storeId: number,
  file: { buffer: Buffer; filename: string }
): Promise<ImportPreview> {
  const sheet = await parseImportFile(file.buffer, file.filename);
  const context = await loadImportContext(supabase, storeId);
  return validateImport(sheet, context);
}
