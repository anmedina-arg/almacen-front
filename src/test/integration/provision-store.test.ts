import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { provisionStore } from '@/lib/store/provisionStore';
import { FEATURE_FLAG_KEYS } from '@/lib/store/featureFlags';

// Verifica provisionStore() (#26, ADR-0006) contra el proyecto de test real,
// sin mocks — mismo criterio que verify-store-admin-auth.test.ts. Cubre el
// camino "el dueño ya tiene profile" (la mayoría de los casos reales, un
// cliente que ya se registró en algún momento) y el chequeo real de
// "solo accesible a super_admin" contra profiles.role; el camino de
// invitación de un dueño sin cuenta (inviteUserByEmail) queda fuera de este
// test porque dispara un side-effect real contra Supabase Auth (manda un
// email) — no es algo que un test automatizado deba ejecutar contra el
// proyecto de test.
//
// Usa service_role para poder sembrar un profile descartable directamente
// (bypassea RLS) y para que provisionStore() pueda escribir en
// stores/store_admins (sin policies de INSERT, ver ADR-0006/ADR-0005). La FK
// profiles.id -> auth.users no está enforced en test (ver
// docs/ops/poblar-test-db.md), así que un UUID random es un id de profile
// válido acá.
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasServiceRoleCredentials = Boolean(url && serviceRoleKey);

describe('provisionStore (#26)', () => {
  const supabase = createClient(url ?? '', serviceRoleKey ?? '');
  const profileCleanupIds: string[] = [];
  let storeCleanupId: number | null = null;

  afterEach(async () => {
    if (storeCleanupId != null) {
      // ON DELETE CASCADE en store_admins.store_id se lleva la membership.
      await supabase.from('stores').delete().eq('id', storeCleanupId);
      storeCleanupId = null;
    }
    if (profileCleanupIds.length > 0) {
      await supabase.from('profiles').delete().in('id', profileCleanupIds);
      profileCleanupIds.length = 0;
    }
  });

  async function createDisposableProfile(role: 'user' | 'super_admin' = 'user') {
    const id = randomUUID();
    const email = `__test_provision_store_${id}@example.invalid`;
    const { error } = await supabase.from('profiles').insert({ id, email, role });
    expect(error).toBeNull();
    profileCleanupIds.push(id);
    return { id, email };
  }

  it.skipIf(!hasServiceRoleCredentials)(
    'crea stores + store_admins con las 8 flags y el whatsapp_number pedidos, dueño ya existente',
    async () => {
      const owner = await createDisposableProfile();
      const operator = await createDisposableProfile('super_admin');
      const slug = `test-provision-${randomUUID().slice(0, 8)}`;

      const result = await provisionStore(supabase, {
        slug,
        name: 'Store de prueba #26',
        ownerEmail: owner.email,
        operatorEmail: operator.email,
        whatsappNumber: '5493810000000',
        featureFlags: { pos: true, stock: true },
      });
      storeCleanupId = result.storeId;

      expect(result.ownerProfileId).toBe(owner.id);
      expect(result.ownerInvited).toBe(false);
      expect(result.whatsappNumber).toBe('5493810000000');

      const { data: store } = await supabase
        .from('stores')
        .select('id, slug, name, whatsapp_number, feature_flags')
        .eq('id', result.storeId)
        .single();

      expect(store?.slug).toBe(slug);
      expect(store?.name).toBe('Store de prueba #26');
      expect(store?.whatsapp_number).toBe('5493810000000');
      for (const key of FEATURE_FLAG_KEYS) {
        expect(store?.feature_flags[key]).toBe(key === 'pos' || key === 'stock');
      }

      const { data: membership } = await supabase
        .from('store_admins')
        .select('profile_id, store_id, role')
        .eq('store_id', result.storeId)
        .single();

      expect(membership?.profile_id).toBe(owner.id);
      expect(membership?.role).toBe('admin');
    }
  );

  it.skipIf(!hasServiceRoleCredentials)('rechaza un slug ya existente', async () => {
    const owner = await createDisposableProfile();
    const operator = await createDisposableProfile('super_admin');
    const slug = `test-provision-dup-${randomUUID().slice(0, 8)}`;

    const first = await provisionStore(supabase, {
      slug,
      name: 'Primera',
      ownerEmail: owner.email,
      operatorEmail: operator.email,
    });
    storeCleanupId = first.storeId;

    await expect(
      provisionStore(supabase, { slug, name: 'Segunda', ownerEmail: owner.email, operatorEmail: operator.email })
    ).rejects.toThrow(/Ya existe una Store/);
  });

  it.skipIf(!hasServiceRoleCredentials)('rechaza si quien opera la herramienta no es super_admin', async () => {
    const owner = await createDisposableProfile();
    const notSuperAdmin = await createDisposableProfile('user');
    const slug = `test-provision-noauth-${randomUUID().slice(0, 8)}`;

    await expect(
      provisionStore(supabase, { slug, name: 'x', ownerEmail: owner.email, operatorEmail: notSuperAdmin.email })
    ).rejects.toThrow(/no es super_admin/);

    const { data: store } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle();
    expect(store).toBeNull();
  });
});
