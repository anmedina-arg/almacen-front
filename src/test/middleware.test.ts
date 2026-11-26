import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// #190: si Supabase Auth falla, el middleware no puede tirar el catálogo
// público (500), pero tampoco puede dejar pasar a un admin sin sesión.
const getUser = vi.fn();
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

import { middleware } from '@/middleware';

const request = (path: string) => new NextRequest(`https://chaskyapp.vercel.app${path}`);

describe('middleware ante un fallo de Supabase Auth (#190)', () => {
  beforeEach(() => {
    getUser.mockReset();
    getUser.mockRejectedValue(new Error('auth caído'));
  });

  it('el catálogo público sigue respondiendo, tratado como anónimo', async () => {
    const response = await middleware(request('/market-del-cevil'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-store-slug')).toBe('market-del-cevil');
  });

  it('el admin sigue exigiendo sesión: redirige al login', async () => {
    const response = await middleware(request('/market-del-cevil/admin/products'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/market-del-cevil/login');
  });
});
