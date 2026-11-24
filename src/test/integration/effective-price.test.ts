import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Spec #179, ticket 1: punto único de lectura del Precio. Hoy `effective_price`
// devuelve el precio manual (`products.price`); el contrato que se prueba acá
// es el que tienen que respetar los consumidores cuando más adelante el
// cuerpo pase a calcular por fórmula: se pide como columna calculada de
// `products`, devuelve lo que se cobra y respeta RLS (el visitante anónimo
// solo ve productos activos).
const url = process.env.TEST_SUPABASE_URL;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const hasCredentials = Boolean(url && anonKey && serviceRoleKey);

describe.skipIf(!hasCredentials)('effective_price — punto único de lectura del Precio (#179)', () => {
  const admin = createClient(url ?? '', serviceRoleKey ?? '');
  const anon = createClient(url ?? '', anonKey ?? '');
  const slug = `effective-price-${randomUUID().slice(0, 8)}`;
  let storeId: number;
  let activeProductId: number;
  let inactiveProductId: number;

  beforeAll(async () => {
    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ slug, name: slug, feature_flags: {} })
      .select('id')
      .single();
    expect(storeError).toBeNull();
    storeId = store!.id;

    const { data: products, error: productsError } = await admin
      .from('products')
      .insert([
        { name: `${slug}-activo`, price: 1234.56, cost: 0, image: '', categories: '', store_id: storeId, active: true },
        { name: `${slug}-inactivo`, price: 99, cost: 0, image: '', categories: '', store_id: storeId, active: false },
      ])
      .select('id, active');
    expect(productsError).toBeNull();
    activeProductId = products!.find((p) => p.active)!.id;
    inactiveProductId = products!.find((p) => !p.active)!.id;
  });

  afterAll(async () => {
    await admin.from('products').delete().eq('store_id', storeId);
    await admin.from('stores').delete().eq('id', storeId);
  });

  it('devuelve el precio manual del producto, sin redondear', async () => {
    const { data, error } = await admin
      .from('products')
      .select('id, price, effective_price')
      .eq('id', activeProductId)
      .single();
    expect(error).toBeNull();
    expect(Number(data!.effective_price)).toBe(1234.56);
    expect(Number(data!.effective_price)).toBe(Number(data!.price));
  });

  it('se puede pedir con alias `price` para que los consumidores no cambien su forma', async () => {
    const { data, error } = await admin
      .from('products')
      .select('id, price:effective_price')
      .eq('id', activeProductId)
      .single();
    expect(error).toBeNull();
    expect(Number(data!.price)).toBe(1234.56);
  });

  it('el visitante anónimo lo lee en un producto activo (catálogo público)', async () => {
    const { data, error } = await anon
      .from('products')
      .select('id, price:effective_price')
      .eq('id', activeProductId)
      .single();
    expect(error).toBeNull();
    expect(Number(data!.price)).toBe(1234.56);
  });

  it('no filtra el precio de un producto inactivo al visitante anónimo (respeta RLS)', async () => {
    const { data, error } = await anon
      .from('products')
      .select('id, price:effective_price')
      .eq('id', inactiveProductId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
