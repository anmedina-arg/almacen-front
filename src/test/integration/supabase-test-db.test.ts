import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

// Prueba que .env.test está bien configurado y que el proyecto Supabase de
// test (poblado en el ticket #8) responde de verdad — no solo que las env
// vars existen como string.
const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_ANON_KEY;
const hasTestCredentials = Boolean(url && key);

describe('proyecto Supabase de test', () => {
  // Se salta (no falla) si falta .env.test — evita bloquear a quien no
  // tenga el proyecto de test configurado localmente (o un futuro CI sin
  // esos secretos) por una razón ajena al código que se está revisando.
  it.skipIf(!hasTestCredentials)(
    'conecta y puede leer la tabla products (RLS pública, productos activos)',
    async () => {
      const supabase = createClient(url!, key!);
      const { error } = await supabase.from('products').select('id').limit(1);

      expect(error).toBeNull();
    }
  );
});
