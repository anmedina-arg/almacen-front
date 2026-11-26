import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lookupStoreBySlug } from '@/lib/store/lookupStoreBySlug';

// #190: el catálogo no puede confundir "la Store no existe" (404 legítimo) con
// "la consulta falló" (la base no contestó): lo segundo tiene que llegar como
// error, no como null, para no mostrar un falso "tienda no encontrada".
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('lookupStoreBySlug — "no existe" vs "falló la consulta" (#190)', () => {
  const admin: SupabaseClient = createClient(url ?? '', serviceRoleKey ?? '');
  let storeId: number;
  let slug: string;

  beforeAll(async () => {
    if (!hasCredentials) return;
    slug = `test-store-lookup-${randomUUID().slice(0, 8)}`;
    const { data, error } = await admin
      .from('stores')
      .insert({ slug, name: 'Store lookup', whatsapp_number: '5491100000000' })
      .select('id')
      .single();
    if (error) throw error;
    storeId = data.id;
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('stores').delete().eq('id', storeId);
  });

  it.skipIf(!hasCredentials)('devuelve la Store cuando existe', async () => {
    const store = await lookupStoreBySlug(admin, slug);
    expect(store).toMatchObject({
      id: storeId,
      name: 'Store lookup',
      whatsapp_number: '5491100000000',
      is_demo: false,
    });
  });

  it.skipIf(!hasCredentials)('devuelve null cuando la Store no existe', async () => {
    expect(await lookupStoreBySlug(admin, `no-existe-${randomUUID()}`)).toBeNull();
  });

  it('tira error (no null) cuando la base no responde', async () => {
    // PostgREST contesta con error (ej. columna faltante o base degradada).
    // Se usa una respuesta de error y no un fetch que rechaza porque
    // postgrest-js reintenta los fallos de red con espera y alargaría el test.
    const down = createClient('http://localhost:54321', 'anon-key', {
      global: {
        fetch: async () =>
          new Response(JSON.stringify({ message: 'boom' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }),
      },
    });
    await expect(lookupStoreBySlug(down, 'cualquiera')).rejects.toThrow(/stores/);
  });
});
