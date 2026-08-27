import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el dominio Producto Surtido (#92, spec #91): aislamiento por
// Store de familias/variedades, que deshabilitar una Variedad la saca de
// elección para toda su Familia, y que la FK compuesta (familia_id,
// store_id) rechaza a nivel de schema una Variedad apuntando a una Familia
// de otra Store — misma lección de #103 (create_order() confiaba en que
// product_id perteneciera a la Store correcta; acá se hace estructuralmente
// imposible en vez de confiar en el código de aplicación).
//
// Mismo patrón que store-scoping-combos.test.ts: usuarios de Auth reales
// (de un solo uso, vía la API admin) + sesión firmada con la anon key, para
// probar la policy en sí — no solo la lógica JS. Sin test de SELECT
// cruzado bloqueado: "Anyone can read familias/variedades" (USING true) es
// a propósito, sostiene el catálogo público.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

type StoreFixture = {
  storeId: number;
  userId: string;
  familiaId: number;
  variedadId: number;
  client: SupabaseClient;
};

describe('store scoping — familias/variedades (#92)', () => {
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

    const email = `__test_scoping_surtido_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    const userId = authData!.user!.id;

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    const { data: familia, error: familiaError } = await admin
      .from('familias')
      .insert({ name: `${slug}-familia`, store_id: storeId })
      .select('id')
      .single();
    expect(familiaError).toBeNull();

    const { data: variedad, error: variedadError } = await admin
      .from('variedades')
      .insert({ name: `${slug}-variedad`, familia_id: familia!.id, store_id: storeId })
      .select('id')
      .single();
    expect(variedadError).toBeNull();

    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();

    return { storeId, userId, familiaId: familia!.id, variedadId: variedad!.id, client };
  }

  async function deleteFixture(fixture: StoreFixture) {
    await admin.from('variedades').delete().eq('familia_id', fixture.familiaId);
    await admin.from('familias').delete().eq('id', fixture.familiaId);
    await admin.from('store_admins').delete().eq('store_id', fixture.storeId);
    await admin.from('profiles').delete().eq('id', fixture.userId);
    await admin.auth.admin.deleteUser(fixture.userId);
    await admin.from('stores').delete().eq('id', fixture.storeId);
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeA = await createFixture(`test-scoping-surtido-a-${randomUUID().slice(0, 8)}`);
    storeB = await createFixture(`test-scoping-surtido-b-${randomUUID().slice(0, 8)}`);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await deleteFixture(storeA);
    await deleteFixture(storeB);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A puede editar su propia Familia vía RLS', async () => {
    const { data, error } = await storeA.client
      .from('familias')
      .update({ name: `renombrada-${randomUUID().slice(0, 8)}` })
      .eq('id', storeA.familiaId)
      .select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede editar la Familia de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('familias')
      .update({ name: 'hackeada' })
      .eq('id', storeB.familiaId)
      .select('id');

    // RLS bloquea silenciosamente (0 filas afectadas), no tira error.
    expect(data).toEqual([]);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede editar la Variedad de la Store B vía RLS directa', async () => {
    const { data } = await storeA.client
      .from('variedades')
      .update({ active: false })
      .eq('id', storeB.variedadId)
      .select('id');

    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from('variedades')
      .select('active')
      .eq('id', storeB.variedadId)
      .single();
    expect(unchanged?.active).toBe(true);
  });

  it.skipIf(!hasCredentials)('el admin de la Store A NO puede insertar una Variedad en la Familia de la Store B vía RLS directa', async () => {
    const { data, error } = await storeA.client
      .from('variedades')
      .insert({ name: 'intruso', familia_id: storeB.familiaId, store_id: storeB.storeId })
      .select('id');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it.skipIf(!hasCredentials)(
    'el admin de la Store A puede LEER la Familia/Variedad de la Store B — lectura pública sin restricción, sostiene el catálogo',
    async () => {
      const { data: familia, error: familiaError } = await storeA.client
        .from('familias')
        .select('id')
        .eq('id', storeB.familiaId)
        .maybeSingle();
      expect(familiaError).toBeNull();
      expect(familia?.id).toBe(storeB.familiaId);

      const { data: variedad, error: variedadError } = await storeA.client
        .from('variedades')
        .select('id')
        .eq('id', storeB.variedadId)
        .maybeSingle();
      expect(variedadError).toBeNull();
      expect(variedad?.id).toBe(storeB.variedadId);
    }
  );

  it.skipIf(!hasCredentials)(
    'FK compuesta: una Variedad no puede apuntar a una Familia de otra Store, ni con service_role',
    async () => {
      const { data, error } = await admin
        .from('variedades')
        .insert({ name: 'cross-store', familia_id: storeA.familiaId, store_id: storeB.storeId })
        .select('id');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    }
  );

  it.skipIf(!hasCredentials)(
    'deshabilitar una Variedad la saca de elección para toda su Familia',
    async () => {
      const before = await admin
        .from('variedades')
        .select('id')
        .eq('familia_id', storeA.familiaId)
        .eq('active', true);
      expect(before.data?.map((v) => v.id)).toContain(storeA.variedadId);

      const { error: disableError } = await admin
        .from('variedades')
        .update({ active: false })
        .eq('id', storeA.variedadId);
      expect(disableError).toBeNull();

      const after = await admin
        .from('variedades')
        .select('id')
        .eq('familia_id', storeA.familiaId)
        .eq('active', true);
      expect(after.data?.map((v) => v.id)).not.toContain(storeA.variedadId);

      // Reactivar para no dejar el fixture en un estado distinto al que
      // deleteFixture espera limpiar (no afecta la aserción de arriba).
      await admin.from('variedades').update({ active: true }).eq('id', storeA.variedadId);
    }
  );

  it.skipIf(!hasCredentials)(
    'UNIQUE(familia_id, name): no se puede repetir el nombre de una Variedad dentro de la misma Familia',
    async () => {
      const name = `dup-${randomUUID().slice(0, 8)}`;
      const { error } = await admin
        .from('variedades')
        .insert({ name, familia_id: storeA.familiaId, store_id: storeA.storeId });
      expect(error).toBeNull();

      const { error: dupError } = await admin
        .from('variedades')
        .insert({ name, familia_id: storeA.familiaId, store_id: storeA.storeId });
      expect(dupError).not.toBeNull();

      await admin.from('variedades').delete().eq('name', name);
    }
  );

  it.skipIf(!hasCredentials)(
    'borrar una Familia borra sus Variedades en cascada (#93)',
    async () => {
      const { data: familia } = await admin
        .from('familias')
        .insert({ name: `cascade-${randomUUID().slice(0, 8)}`, store_id: storeA.storeId })
        .select('id')
        .single();
      const { data: variedad } = await admin
        .from('variedades')
        .insert({ name: 'sabor-cascade', familia_id: familia!.id, store_id: storeA.storeId })
        .select('id')
        .single();

      const { error: deleteError } = await admin.from('familias').delete().eq('id', familia!.id);
      expect(deleteError).toBeNull();

      const { data: orphanVariedad } = await admin
        .from('variedades')
        .select('id')
        .eq('id', variedad!.id)
        .maybeSingle();
      expect(orphanVariedad).toBeNull();
    }
  );

  it.skipIf(!hasCredentials)(
    'NO se puede borrar una Familia mientras un producto la referencia como Producto Surtido (#93)',
    async () => {
      const { data: familia } = await admin
        .from('familias')
        .insert({ name: `blocked-${randomUUID().slice(0, 8)}`, store_id: storeA.storeId })
        .select('id')
        .single();
      const { data: producto } = await admin
        .from('products')
        .insert({
          name: 'surtido-bloquea-delete',
          price: 100,
          image: '',
          categories: '',
          store_id: storeA.storeId,
          active: false,
          is_producto_surtido: true,
          familia_id: familia!.id,
          min_variedades: 1,
          max_variedades: 2,
        })
        .select('id')
        .single();
      await admin.from('product_price_history').delete().eq('product_id', producto!.id);

      const { error: deleteError } = await admin.from('familias').delete().eq('id', familia!.id);
      expect(deleteError).not.toBeNull();

      const { data: stillThere } = await admin
        .from('familias')
        .select('id')
        .eq('id', familia!.id)
        .maybeSingle();
      expect(stillThere?.id).toBe(familia!.id);

      // Limpieza: primero el producto (libera la referencia), después la Familia.
      await admin.from('products').delete().eq('id', producto!.id);
      await admin.from('familias').delete().eq('id', familia!.id);
    }
  );
});
