import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Verifica el backfill de supabase/supabase_backfill_store_id.sql (ticket #11)
// contra el proyecto de test: existe la Store "market-del-cevil" y ninguna
// tabla de negocio tiene filas con store_id IS NULL.
//
// Usa la service_role key (no la anon key): la mayoría de estas tablas
// (orders, order_items, product_stock, etc.) solo permiten SELECT a admins
// vía RLS — con la anon key un count siempre daría 0, sea cierto o no
// (falso positivo). service_role bypassea RLS, así que el conteo refleja
// el estado real de la tabla.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasServiceRoleCredentials = Boolean(url && serviceRoleKey);

// Lista autoritativa (ver ticket #10/#11 y el header de
// supabase/supabase_multitenant_schema_expand.sql) — mantener en sync.
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

describe('backfill store_id — Market del Cevil (#11)', () => {
  const supabase = createClient(url ?? '', serviceRoleKey ?? '');

  it.skipIf(!hasServiceRoleCredentials)('existe la Store market-del-cevil', async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('id, slug, name')
      .eq('slug', 'market-del-cevil')
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it.skipIf(!hasServiceRoleCredentials).each(TABLES_WITH_STORE_ID)(
    '%s no tiene filas con store_id IS NULL',
    async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .is('store_id', null);

      expect(error).toBeNull();
      expect(count).toBe(0);
    }
  );
});
