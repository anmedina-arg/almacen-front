import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// #190: si Supabase Auth falla, el middleware no puede tirar el catálogo
// público (500), pero tampoco puede dejar pasar a un admin sin sesión.
const getUser = vi.fn();
// getUser recibe las opciones del client para poder simular un refresh de
// sesión que escribe cookies vía `cookies.setAll` (#194).
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: unknown) => ({
    auth: { getUser: () => getUser(options) },
  }),
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

describe('middleware en /admin, panel del Platform admin (#194)', () => {
  beforeEach(() => {
    getUser.mockReset();
    getUser.mockResolvedValue({ data: { user: null } });
  });

  const legacyRequest = (path: string) =>
    new NextRequest(`https://market-del-cevil.vercel.app${path}`, {
      headers: { host: 'market-del-cevil.vercel.app' },
    });

  it('sin sesión, /admin redirige al login de plataforma con el destino', async () => {
    const response = await middleware(request('/admin'));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/admin/login');
    expect(location.searchParams.get('redirectTo')).toBe('/admin');
  });

  it('el login y el callback de OAuth se sirven sin sesión', async () => {
    expect((await middleware(request('/admin/login'))).status).toBe(200);
    expect((await middleware(request('/admin/auth/callback?code=x'))).status).toBe(200);
  });

  it('con sesión, /admin pasa (el rol lo comprueba la página) y refresca la sesión', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const response = await middleware(request('/admin'));
    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalled();
    expect(response.headers.get('x-store-slug')).toBeNull();
  });

  it('con el token vencido, las cookies renovadas llegan a la respuesta', async () => {
    getUser.mockImplementation(async (options) => {
      options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'nuevo', options: {} }]);
      return { data: { user: { id: 'u1' } } };
    });
    const response = await middleware(request('/admin'));
    expect(response.status).toBe(200);
    expect(response.cookies.get('sb-test-auth-token')?.value).toBe('nuevo');
  });

  it('el destino conserva la query string', async () => {
    const response = await middleware(request('/admin?tab=flags'));
    const location = new URL(response.headers.get('location')!);
    expect(location.searchParams.get('redirectTo')).toBe('/admin?tab=flags');
  });

  it('si Supabase Auth falla, /admin manda al login (no abre el panel)', async () => {
    getUser.mockRejectedValue(new Error('auth caído'));
    const response = await middleware(request('/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/admin/login');
  });

  it('en el host legacy, /admin va al dominio oficial conservando path y query', async () => {
    const response = await middleware(legacyRequest('/admin/login?redirectTo=%2Fadmin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://chaskyapp.vercel.app/admin/login?redirectTo=%2Fadmin'
    );
  });

  it('en el host legacy, el resto sigue igual (catálogo same-origin)', async () => {
    const response = await middleware(legacyRequest('/'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://market-del-cevil.vercel.app/market-del-cevil'
    );
  });
});
