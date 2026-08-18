import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Verifica que la migración de supabase/supabase_multitenant_schema_expand.sql
// (ticket #10) se aplicó correctamente contra el proyecto Supabase de test:
// la tabla `stores` existe y cada tabla de negocio tiene la columna `store_id`.
//
// Selecciona con la anon key (no requiere service role): a estas tablas,
// RLS puede devolver 0 filas para un usuario anónimo, pero un `select`
// sobre una columna inexistente sigue siendo un error de PostgREST — es
// justamente lo que este test detecta.
const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_ANON_KEY;
const hasTestCredentials = Boolean(url && key);

// Lista autoritativa (ver ticket #10 y el header de
// supabase/supabase_multitenant_schema_expand.sql) — mantener ambas en sync.
const TABLES_WITH_STORE_ID = [
  'products',
  'categories',
  'subcategories',
  'clients',
  'orders',
  'order_items',
  'order_payments',
  'product_stock',
  'stock_movement_log',
  'product_affinity',
  'category_affinity_rules',
  'product_price_history',
  'combo_components',
] as const;

describe('schema expand multi-tenant (#10)', () => {
  const supabase = createClient(url ?? '', key ?? '');

  it.skipIf(!hasTestCredentials)('la tabla stores existe y es consultable', async () => {
    const { error } = await supabase.from('stores').select('id').limit(1);
    expect(error).toBeNull();
  });

  it.skipIf(!hasTestCredentials).each(TABLES_WITH_STORE_ID)(
    '%s tiene la columna store_id',
    async (table) => {
      const { error } = await supabase.from(table).select('store_id').limit(1);
      expect(error).toBeNull();
    }
  );
});
