import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Prueba que .env.test está bien configurado y que el proyecto Supabase de
// test (poblado en el ticket #8) responde de verdad — no solo que las env
// vars existen como string.
describe('proyecto Supabase de test', () => {
  it('conecta y puede leer la tabla products (RLS pública, productos activos)', async () => {
    const url = process.env.TEST_SUPABASE_URL;
    const key = process.env.TEST_SUPABASE_ANON_KEY;

    expect(url, 'TEST_SUPABASE_URL debe estar seteada en .env.test').toBeTruthy();
    expect(key, 'TEST_SUPABASE_ANON_KEY debe estar seteada en .env.test').toBeTruthy();

    const supabase = createClient(url!, key!);
    const { error } = await supabase.from('products').select('id').limit(1);

    expect(error).toBeNull();
  });
});
