import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifica el cierre del contract (#22): store_id NOT NULL en las 13 tablas
// de negocio + el puente permisivo de is_store_admin() removido.
//
// backfill-store-id.test.ts ya confirma "0 filas con store_id IS NULL" en
// las 13 tablas — este archivo confirma la otra mitad: que ahora es
// literalmente imposible insertar una fila nueva sin store_id (constraint
// NOT NULL, no solo disciplina de la app) y que is_store_admin(NULL) ya no
// se resuelve permisivamente.
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

describe('contract — store_id NOT NULL + puente permisivo removido (#22)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let userId: string;
  let client: SupabaseClient;

  beforeAll(async () => {
    if (!hasCredentials) return;

    const slug = `test-contract-${randomUUID().slice(0, 8)}`;
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const email = `__test_contract_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(authError).toBeNull();
    userId = authData!.user!.id;

    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();

    const { error: membershipError } = await admin
      .from('store_admins')
      .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
    expect(membershipError).toBeNull();

    client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('store_admins').delete().eq('store_id', storeId);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('INSERT en categories con store_id NULL falla por constraint NOT NULL, no por RLS', async () => {
    const { error } = await admin
      .from('categories')
      .insert({ name: `test-contract-categoria-${randomUUID().slice(0, 8)}`, store_id: null, sort_order: 1 });

    expect(error).not.toBeNull();
    // 23502 = not_null_violation — confirma que es la constraint de schema,
    // no una policy de RLS bloqueando el insert (esas dan otro código).
    expect(error?.code).toBe('23502');
  });

  it.skipIf(!hasCredentials)('INSERT en products con store_id NULL falla por constraint NOT NULL', async () => {
    const { error } = await admin
      .from('products')
      .insert({ name: 'test-contract-producto', price: 100, image: '', categories: '', store_id: null, active: false });

    expect(error).not.toBeNull();
    expect(error?.code).toBe('23502');
  });

  it.skipIf(!hasCredentials)('is_store_admin(NULL) ya no es permisivo — un store admin real no puede pasar NULL para colarse', async () => {
    const { data, error } = await client.rpc('is_store_admin', { check_store_id: null });

    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it.skipIf(!hasCredentials)('is_store_admin(storeId propio) sigue devolviendo true — el fix no rompió el caso normal', async () => {
    const { data, error } = await client.rpc('is_store_admin', { check_store_id: storeId });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });
});
