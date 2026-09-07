import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requireFlag } from '@/lib/store/requireFlag';
import type { RouteContext } from '@/lib/api/createApiRoute';

// requireFlag (#120) es el primer guard de flag a nivel API — antes,
// 'clientes'/'pagos' solo ocultaban UI en OrdersTable, la ruta funcionaba
// igual sin la flag (gap real, #110). Se testea directo contra un ctx
// fabricado (no via HTTP) porque simular una sesión real de Next.js/
// @supabase/ssr por curl es mucho más frágil que llamar al guard con el
// contrato que realmente usa (RouteContext).
const url = process.env.TEST_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && serviceRoleKey);

describe('requireFlag guard (#120)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  let storeOffId: number;
  let storeOffSlug: string;
  let storeOnId: number;
  let storeOnSlug: string;

  function fakeCtx(storeId: number, storeSlug: string): RouteContext {
    return {
      request: new Request('http://localhost/test') as unknown as RouteContext['request'],
      supabase: admin,
      storeSlug,
      storeId,
      userId: null,
    };
  }

  beforeAll(async () => {
    if (!hasCredentials) return;
    storeOffSlug = `test-require-flag-off-${randomUUID().slice(0, 8)}`;
    const { data: storeOff, error: offError } = await admin
      .from('stores')
      .insert({ slug: storeOffSlug, name: storeOffSlug, feature_flags: { clientes: false, pagos: false } })
      .select('id')
      .single();
    expect(offError).toBeNull();
    storeOffId = storeOff!.id;

    storeOnSlug = `test-require-flag-on-${randomUUID().slice(0, 8)}`;
    const { data: storeOn, error: onError } = await admin
      .from('stores')
      .insert({ slug: storeOnSlug, name: storeOnSlug, feature_flags: { clientes: true, pagos: true } })
      .select('id')
      .single();
    expect(onError).toBeNull();
    storeOnId = storeOn!.id;
  });

  afterAll(async () => {
    if (!hasCredentials) return;
    await admin.from('stores').delete().in('id', [storeOffId, storeOnId]);
  });

  it.skipIf(!hasCredentials)('devuelve 403 cuando la flag está apagada para esa Store', async () => {
    const guard = requireFlag('clientes');
    const result = await guard(fakeCtx(storeOffId, storeOffSlug));

    expect(result).toBeDefined();
    expect(result?.status).toBe(403);
    const body = await result?.json();
    expect(body.error).toContain('clientes');
  });

  it.skipIf(!hasCredentials)('deja pasar (undefined) cuando la flag está prendida para esa Store', async () => {
    const guard = requireFlag('clientes');
    const result = await guard(fakeCtx(storeOnId, storeOnSlug));

    expect(result).toBeUndefined();
  });

  it.skipIf(!hasCredentials)('chequea la flag pedida, no cualquiera — pagos:true no habilita clientes si clientes:false', async () => {
    // storeOffId tiene clientes:false Y pagos:false — confirma que
    // requireFlag('pagos') también rechaza ahí, no solo 'clientes'.
    const guard = requireFlag('pagos');
    const result = await guard(fakeCtx(storeOffId, storeOffSlug));

    expect(result?.status).toBe(403);
  });
});
