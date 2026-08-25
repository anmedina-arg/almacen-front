import { describe, expect, it } from 'vitest';
import { provisionStore } from './provisionStore';

// Cubre el seam puro (validación de slug) sin tocar la red — el resto de
// provisionStore() (lookup/invite de owner, RPC) se cubre en
// src/test/integration/provision-store.test.ts contra el proyecto de test
// real, mismo criterio que el resto de este repo para lógica que solo tiene
// sentido contra Supabase de verdad (RLS, triggers, FKs).
describe('provisionStore — validación de slug', () => {
  const supabaseStub = {} as never;

  it('rechaza un slug con mayúsculas', async () => {
    await expect(
      provisionStore(supabaseStub, { slug: 'Nueva-Store', name: 'x', ownerEmail: 'a@b.com' })
    ).rejects.toThrow(/Slug inválido/);
  });

  it('rechaza un slug con espacios', async () => {
    await expect(
      provisionStore(supabaseStub, { slug: 'nueva store', name: 'x', ownerEmail: 'a@b.com' })
    ).rejects.toThrow(/Slug inválido/);
  });

  it('rechaza un slug con guion al inicio o al final', async () => {
    await expect(
      provisionStore(supabaseStub, { slug: '-nueva-store', name: 'x', ownerEmail: 'a@b.com' })
    ).rejects.toThrow(/Slug inválido/);
  });

  it('rechaza un slug reservado por el sitio (api)', async () => {
    await expect(
      provisionStore(supabaseStub, { slug: 'api', name: 'x', ownerEmail: 'a@b.com' })
    ).rejects.toThrow(/Slug reservado/);
  });
});
