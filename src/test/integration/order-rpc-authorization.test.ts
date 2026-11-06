import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Fix de seguridad (2026-10-20): cancel_order y confirm_order son SECURITY
// DEFINER y no validaban al caller — la verificación vivía solo en las
// rutas de API, así que cualquiera con la anon key podía cancelar o
// confirmar cualquier orden de cualquier Store llamando /rest/v1/rpc
// directo. Ahora la propia función exige admin de la Store de la orden
// (o service_role, que ya bypassea RLS por rol y es solo server-side).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

describe('cancel_order / confirm_order exigen admin de la Store de la orden', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const anon = createClient(url ?? '', anonKey ?? '');
  const storeIds: number[] = [];
  const userIds: string[] = [];
  const orderIds: number[] = [];
  let storeAId: number;
  let adminAClient: SupabaseClient;
  let adminBClient: SupabaseClient;
  let plainUserClient: SupabaseClient;

  async function createStore(prefix: string) {
    const slug = `${prefix}-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin.from('stores').insert({ slug, name: slug }).select('id').single();
    expect(error).toBeNull();
    storeIds.push(data!.id);
    return data!.id as number;
  }

  async function signedInUser(storeId: number | null) {
    const email = `__test_order_rpc_auth_${randomUUID()}@example.invalid`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(error).toBeNull();
    const userId = data!.user!.id;
    userIds.push(userId);
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, email, role: 'user' });
    expect(profileError).toBeNull();
    if (storeId !== null) {
      const { error: membershipError } = await admin
        .from('store_admins')
        .insert({ profile_id: userId, store_id: storeId, role: 'admin' });
      expect(membershipError).toBeNull();
    }
    const client = createClient(url ?? '', anonKey ?? '');
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    expect(signInError).toBeNull();
    return client;
  }

  async function pendingOrderInStoreA() {
    const { data, error } = await admin.rpc('create_order', {
      p_user_id: null,
      p_notes: null,
      p_whatsapp_message: 'test',
      p_items: [],
      p_store_id: storeAId,
    });
    expect(error).toBeNull();
    orderIds.push(data.order_id);
    return data.order_id as number;
  }

  async function statusOf(orderId: number) {
    const { data } = await admin.from('orders').select('status').eq('id', orderId).single();
    return data!.status as string;
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeAId = await createStore('test-order-auth-a');
    const storeBId = await createStore('test-order-auth-b');
    adminAClient = await signedInUser(storeAId);
    adminBClient = await signedInUser(storeBId);
    plainUserClient = await signedInUser(null);
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('orders').delete().in('id', orderIds);
    await admin.from('store_admins').delete().in('profile_id', userIds);
    await admin.from('profiles').delete().in('id', userIds);
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    await admin.from('stores').delete().in('id', storeIds);
  });

  it.skipIf(!hasCredentials)('un visitante sin sesión no puede cancelar ni confirmar', async () => {
    const orderId = await pendingOrderInStoreA();

    const cancel = await anon.rpc('cancel_order', { p_order_id: orderId });
    const confirm = await anon.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: null });

    // 42501 = permission denied: lo frena el REVOKE de EXECUTE a anon.
    expect(cancel.error?.code).toBe('42501');
    expect(confirm.error?.code).toBe('42501');
    expect(await statusOf(orderId)).toBe('pending');
  });

  it.skipIf(!hasCredentials)('un usuario logueado sin Store no puede cancelar ni confirmar', async () => {
    const orderId = await pendingOrderInStoreA();

    const cancel = await plainUserClient.rpc('cancel_order', { p_order_id: orderId });
    const confirm = await plainUserClient.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: null });

    expect(cancel.error?.message).toMatch(/Forbidden/);
    expect(confirm.error?.message).toMatch(/Forbidden/);
    expect(await statusOf(orderId)).toBe('pending');
  });

  it.skipIf(!hasCredentials)('el admin de otra Store no puede cancelar ni confirmar', async () => {
    const orderId = await pendingOrderInStoreA();

    const cancel = await adminBClient.rpc('cancel_order', { p_order_id: orderId });
    const confirm = await adminBClient.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: null });

    expect(cancel.error?.message).toMatch(/Forbidden/);
    expect(confirm.error?.message).toMatch(/Forbidden/);
    expect(await statusOf(orderId)).toBe('pending');
  });

  it.skipIf(!hasCredentials)('el admin de la Store de la orden puede confirmar y cancelar', async () => {
    const confirmedId = await pendingOrderInStoreA();
    const confirm = await adminAClient.rpc('confirm_order', { p_order_id: confirmedId, p_confirmed_by: null });
    expect(confirm.error).toBeNull();
    expect(await statusOf(confirmedId)).toBe('confirmed');

    const cancelledId = await pendingOrderInStoreA();
    const cancel = await adminAClient.rpc('cancel_order', { p_order_id: cancelledId });
    expect(cancel.error).toBeNull();
    expect(await statusOf(cancelledId)).toBe('cancelled');
  });

  // #155: confirmed_by es el campo de auditoría de "quién confirmó". Antes se
  // guardaba el UUID que mandaba quien llamaba, así que un admin de la Store
  // podía dejar el pedido registrado como confirmado por otra persona
  // llamando /rest/v1/rpc directo. Ahora, para quien no es service_role,
  // es siempre auth.uid(): NULL o su propio id se resuelven a su usuario y
  // cualquier otro UUID es Forbidden. service_role (tests, scripts) sigue
  // pudiendo mandarlo explícito.
  describe('confirm_order: confirmed_by es el usuario de la sesión (#155)', () => {
    async function confirmedByOf(orderId: number) {
      const { data } = await admin.from('orders').select('confirmed_by').eq('id', orderId).single();
      return data!.confirmed_by as string | null;
    }

    async function userIdOf(client: SupabaseClient) {
      const { data, error } = await client.auth.getUser();
      expect(error).toBeNull();
      return data.user!.id;
    }

    it.skipIf(!hasCredentials)('un admin no puede registrar el pedido como confirmado por otra persona', async () => {
      const orderId = await pendingOrderInStoreA();
      const otherAdminId = await userIdOf(adminBClient);

      const confirm = await adminAClient.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: otherAdminId });

      expect(confirm.error?.message).toMatch(/Forbidden/);
      expect(await statusOf(orderId)).toBe('pending');
      expect(await confirmedByOf(orderId)).toBeNull();
    });

    it.skipIf(!hasCredentials)('un admin que manda NULL queda registrado como quien confirmó', async () => {
      const orderId = await pendingOrderInStoreA();
      const adminAId = await userIdOf(adminAClient);

      const confirm = await adminAClient.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: null });

      expect(confirm.error).toBeNull();
      expect(confirm.data.confirmed_by).toBe(adminAId);
      expect(await confirmedByOf(orderId)).toBe(adminAId);
    });

    it.skipIf(!hasCredentials)('un admin que manda su propio id queda registrado igual', async () => {
      const orderId = await pendingOrderInStoreA();
      const adminAId = await userIdOf(adminAClient);

      const confirm = await adminAClient.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: adminAId });

      expect(confirm.error).toBeNull();
      expect(await confirmedByOf(orderId)).toBe(adminAId);
    });

    it.skipIf(!hasCredentials)('el service_role puede mandar confirmed_by explícito', async () => {
      const orderId = await pendingOrderInStoreA();
      const someUserId = await userIdOf(adminBClient);

      const confirm = await admin.rpc('confirm_order', { p_order_id: orderId, p_confirmed_by: someUserId });

      expect(confirm.error).toBeNull();
      expect(await confirmedByOf(orderId)).toBe(someUserId);
    });
  });
});
