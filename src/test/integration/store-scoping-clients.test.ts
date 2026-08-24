import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el aislamiento por Store de clients (ticket #19): el admin de
// una Store nunca ve ni modifica clientes de otra, ni por API (el
// .eq('store_id', ...) agregado a la ruta) ni por RLS directa.
//
// Mismo patrón que store-scoping-combos.test.ts: usuarios de Auth reales
// (de un solo uso, vía la API admin) + sesión firmada con la anon key,
// para probar la policy en sí — no solo la lógica JS. A diferencia de
// combos, acá SÍ se prueba INSERT con store_id ajeno (WITH CHECK): la
// policy vieja de clients no tenía WITH CHECK en absoluto — #19 lo agrega
// por primera vez, ver supabase/schema/clients/clients.sql.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  clientId: number;
  client: SupabaseClient;
};

describe('store scoping — clients (#19)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeA: StoreFixture;
  let storeB: StoreFixture;

  async function createFixture(slug: string): Promise<StoreFixture> {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    const storeId = store!.id;

    const email = `__test_scoping_clients_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    // handle_new_user() no está replicado en test (ver store-scoping-products.test.ts).
    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    // barrio 'otros' sin manzana_lote — evita depender del regex de lote
    // estructurado, y cada Store solo necesita un "otros" catch-all.
    const { data: clientRow, error: clientError } = await admin
      .from('clients')
      .insert({ barrio: 'otros', store_id: storeId })
      .select('id')
      .single();
    expect(clientError).toBeNull();

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return { storeId, userId, clientId: clientRow!.id, client };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('clients').delete().eq('store_id', fixture.storeId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-clients-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-clients-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A ve su propio cliente vía RLS', async () => {
    const { data, error } = await storeA.client
      .from('clients')
      .select('id')
      .eq('id', storeA.clientId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(storeA.clientId);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO ve el cliente de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('clients')
      .select('id')
      .eq('id', storeB.clientId)
      .maybeSingle();

    expect(data).toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede actualizar el cliente de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('clients')
      .update({ manzana_lote: 'hackeado' })
      .eq('id', storeB.clientId)
      .select('id');

    // RLS bloquea silenciosamente (0 filas afectadas), no tira error.
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from('clients')
      .select('manzana_lote')
      .eq('id', storeB.clientId)
      .single();
    expect(unchanged?.manzana_lote).toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede insertar un cliente con store_id de la Store B (WITH CHECK)', async () => {
    const { data, error } = await storeA.client
      .from('clients')
      .insert({ barrio: 'AC1', manzana_lote: 'A01', store_id: storeB.storeId })
      .select('id');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede borrar el cliente de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('clients')
      .delete()
      .eq('id', storeB.clientId)
      .select('id');

    expect(data).toEqual([]);

    const { data: stillThere } = await admin
      .from('clients')
      .select('id')
      .eq('id', storeB.clientId)
      .maybeSingle();
    expect(stillThere?.id).toBe(storeB.clientId);
  });
});
