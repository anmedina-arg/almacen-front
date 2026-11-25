import type { SupabaseClient } from '@supabase/supabase-js';
import { ConflictError, ValidationError } from '@/lib/api/errors';
import { parseImportFile } from '../import/parseImportFile';
import { planImport, type ConfirmImportOptions } from '../import/planImport';
import { getImageHostRules, isAllowedImageUrl } from '@/lib/images/imageHosts';
import { validateImport, type ImportContext, type ImportPreview } from '../import/validateImport';

const PAGE_SIZE = 1000;
/** Códigos de Postgres que `import_products` puede devolver. */
const INVALID_PARAMETER = '22023'; // fila inválida que la validación no atajó; el mensaje es de la función, no interno
const UNIQUE_VIOLATION = '23505';

export interface ImportFile {
  buffer: Buffer;
  filename: string;
}

export interface ImportResult {
  productsCreated: number;
  categoriesCreated: number;
  subcategoriesCreated: number;
  /** Filas que no se crearon: con error, o duplicadas que no se incluyeron. */
  skippedCount: number;
}

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

  const imageHostRules = getImageHostRules();
  return {
    isAllowedImageUrl: (url) => isAllowedImageUrl(url, imageHostRules),
    existingProductNames,
    categories: (categories ?? []).map((c) => ({
      name: c.name as string,
      subcategories: ((c.subcategories ?? []) as { name: string }[]).map((s) => s.name),
    })),
  };
}

async function buildPreview(supabase: SupabaseClient, storeId: number, file: ImportFile): Promise<ImportPreview> {
  const sheet = await parseImportFile(file.buffer, file.filename);
  return validateImport(sheet, await loadImportContext(supabase, storeId));
}

/** Importación masiva, primera mitad (#182): lee el archivo y arma la vista previa. No escribe nada. */
export async function previewImport(
  supabase: SupabaseClient,
  storeId: number,
  file: ImportFile
): Promise<ImportPreview> {
  return buildPreview(supabase, storeId, file);
}

/**
 * Importación masiva, segunda mitad (#185): vuelve a validar el archivo contra
 * el estado actual de la Store (el cliente no es fuente de verdad: otro admin
 * pudo crear un producto o una categoría desde la vista previa) y crea los
 * Productos en una única transacción. Las categorías y subcategorías nuevas
 * se crean solo si el usuario las confirmó.
 */
export async function confirmImport(
  supabase: SupabaseClient,
  storeId: number,
  file: ImportFile,
  options: ConfirmImportOptions
): Promise<ImportResult> {
  const preview = await buildPreview(supabase, storeId, file);
  if (preview.fileError) throw new ValidationError(preview.fileError);

  const plan = planImport(preview, options);
  if (plan.products.length === 0) throw new ValidationError('No hay filas para crear');
  if ((plan.newCategories.length > 0 || plan.newSubcategories.length > 0) && !options.confirmNewCategories) {
    throw new ValidationError('Confirmá las categorías y subcategorías nuevas antes de crear los productos');
  }

  const { data, error } = await supabase.rpc('import_products', {
    p_store_id: storeId,
    p_rows: plan.products.map((p) => ({
      name: p.name,
      category_name: p.categoryName,
      subcategory_name: p.subcategoryName,
      sale_type: p.saleType,
      price: p.price,
      image: p.imageUrl,
      active: p.active,
    })),
  });
  if (error) {
    if (error.code === INVALID_PARAMETER) throw new ValidationError(error.message);
    if (error.code === UNIQUE_VIOLATION) {
      // Otra persona creó la misma categoría o subcategoría entre la validación y la creación;
      // la transacción se deshizo entera, no quedó nada a medias.
      throw new ConflictError('Otra persona creó una categoría igual mientras importabas. Volvé a subir el archivo.');
    }
    throw new Error(error.message);
  }

  const result = data as { products_created: number; categories_created: number; subcategories_created: number };
  return {
    productsCreated: result.products_created,
    categoriesCreated: result.categories_created,
    subcategoriesCreated: result.subcategories_created,
    skippedCount: plan.skipped.length,
  };
}
