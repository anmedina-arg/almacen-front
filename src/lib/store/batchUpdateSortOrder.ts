import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '@/lib/api/errors';

interface BatchUpdateSortOrderOptions {
  table: string;
  storeId: number;
  ids: number[];
  /**
   * Columnas NOT NULL sin default que hay que traer antes de escribir.
   * `.upsert()` arma la fila candidata de INSERT (rama especulativa de
   * ON CONFLICT) ANTES de saber si va a resolver a UPDATE — una fila
   * parcial (solo id+sort_order) rompe esa rama si falta una columna
   * NOT NULL sin default (ej. `name`), aunque el conflicto siempre exista
   * en la práctica. Ver resolución del ticket wayfinder #109.
   */
  requiredColumns: string[];
  /** Columnas cuyo valor ya se conoce (no hace falta traerlas) — típicamente store_id, y el id del padre si aplica (ej. category_id para subcategories). */
  knownColumns?: Record<string, number>;
  /** Filtro extra de ownership además de store_id (ej. category_id para subcategories, evita reordenar subcategorías de otra categoría). */
  extraOwnershipFilter?: Record<string, number>;
}

/**
 * Reordena en lote — reemplaza el patrón de un UPDATE por fila (N+1
 * confirmado en el audit #106, `categories/reorder` y `stock/entry`) por
 * 2 queries: 1 SELECT para traer las columnas NOT NULL que el upsert
 * necesita + verificar ownership, 1 UPSERT para escribir todo junto.
 *
 * A diferencia del comportamiento anterior (update por fila con id ajeno =
 * no-op silencioso), acá un id que no pertenece a esta Store (ni al filtro
 * extra) rechaza todo el batch — más estricto, pero más correcto: el
 * llamador nunca debería mandar ids ajenos en uso normal, y si lo hace
 * merece un error explícito, no un reorder parcial sin feedback.
 *
 * Limitación conocida, no resuelta acá: el SELECT de ownership y el UPSERT
 * no corren en una transacción — una fila borrada por otro admin entre las
 * dos queries puede resucitar vía la rama INSERT del upsert, con el nombre
 * viejo capturado en el SELECT. Requeriría una función RPC transaccional
 * (mismo tipo de mejora que #105 dejó deliberadamente diferida, "fix de N+1
 * vía RPC" — no bloquea nada, ventana de carrera angosta en uso normal).
 */
export async function batchUpdateSortOrder(
  supabase: SupabaseClient,
  { table, storeId, ids: rawIds, requiredColumns, knownColumns = {}, extraOwnershipFilter }: BatchUpdateSortOrderOptions
): Promise<void> {
  // Deduplicado a propósito: SQL IN() ya colapsa duplicados, así que sin
  // esto un id repetido en el array hacía que existing.length < ids.length
  // y rechazaba el batch entero con un NotFoundError falso, aunque todos
  // los ids fueran válidos.
  const ids = Array.from(new Set(rawIds));
  if (ids.length === 0) return;

  let ownershipQuery = supabase
    .from(table)
    .select(['id', ...requiredColumns].join(', '))
    .eq('store_id', storeId)
    .in('id', ids);

  if (extraOwnershipFilter) {
    for (const [column, value] of Object.entries(extraOwnershipFilter)) {
      ownershipQuery = ownershipQuery.eq(column, value);
    }
  }

  const { data: existing, error: fetchError } = await ownershipQuery;
  if (fetchError) throw new Error(fetchError.message);
  if (!existing || existing.length !== ids.length) {
    throw new NotFoundError(`One or more ${table} ids do not belong to this Store`);
  }

  const rowsById = new Map((existing as unknown as Record<string, unknown>[]).map((row) => [row.id, row]));
  const rows = ids.map((id, index) => ({
    ...rowsById.get(id),
    id,
    sort_order: index + 1,
    store_id: storeId,
    ...knownColumns,
  }));

  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}
