import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { listPublicStores } from '@/features/store/services/listPublicStores';
import { getDemoStore } from '@/features/store/services/getDemoStore';

// Demo Store (#153): la única marca que la saca del listado público (/stores
// y sitemap) es stores.is_demo. Se verifica contra la base local real, con
// el cliente anon — el mismo con el que la página pública lee stores (RLS
// "Anyone can read stores"). Siembra la Store demo con service_role porque
// stores no tiene policies de INSERT (ADR-0006).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

describe('listPublicStores (#153)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const anon = createClient(url ?? '', anonKey ?? '');
  const cleanupIds: number[] = [];

  afterEach(async () => {
    if (cleanupIds.length > 0) {
      await admin.from('stores').delete().in('id', cleanupIds);
      cleanupIds.length = 0;
    }
  });

  async function seedStore(isDemo: boolean) {
    const slug = `test-public-${isDemo ? 'demo' : 'real'}-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin
      .from('stores')
      .insert({ slug, name: `Store ${slug}`, is_demo: isDemo })
      .select('id')
      .single();
    expect(error).toBeNull();
    cleanupIds.push(data!.id);
    return slug;
  }

  it.skipIf(!hasCredentials)('excluye la Demo Store y mantiene las Stores reales', async () => {
    const demoSlug = await seedStore(true);
    const realSlug = await seedStore(false);

    const stores = await listPublicStores(anon);
    const slugs = stores.map((s) => s.slug);

    expect(slugs).not.toContain(demoSlug);
    expect(slugs).toContain(realSlug);
    expect(slugs).toContain('market-del-cevil');
  });

  it.skipIf(!hasCredentials)('getDemoStore resuelve la Demo Store del seed por is_demo, no por slug', async () => {
    // Aunque haya otra Store demo descartable más nueva, gana la más antigua.
    await seedStore(true);

    const demo = await getDemoStore(anon);

    expect(demo).toEqual({ slug: 'demo-store', name: 'Demo Store' });
  });

  it.skipIf(!hasCredentials)('devuelve lo que la página pública necesita: slug, nombre y logo', async () => {
    const stores = await listPublicStores(anon);
    const cevil = stores.find((s) => s.slug === 'market-del-cevil');

    expect(cevil).toEqual({ slug: 'market-del-cevil', name: 'Market del Cevil', logo_url: null });
  });
});
