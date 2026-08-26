import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withStoreAdmin } from './apiAuth';
import { verifyStoreAdminAuth } from './roleHelpers';

// Aislado, sin red — mockea verifyStoreAdminAuth() en vez de pegarle a
// Supabase, mismo criterio que roleHelpers.test.ts para isAdminRole (#43):
// esta es lógica de decisión pura sobre el resultado de verifyStoreAdminAuth,
// que ya tiene su propia cobertura de integración aparte.
vi.mock('./roleHelpers', () => ({
  verifyStoreAdminAuth: vi.fn(),
}));

const mockedVerify = vi.mocked(verifyStoreAdminAuth);

function makeRequest() {
  return new NextRequest('http://localhost/yo-heladerias/api/whatever');
}

function makeCtx(extraParams: Record<string, string> = {}) {
  return { params: Promise.resolve({ store: 'yo-heladerias', ...extraParams }) };
}

describe('withStoreAdmin', () => {
  beforeEach(() => {
    mockedVerify.mockReset();
  });

  it('corta con 403 y el error de verifyStoreAdminAuth si no es admin', async () => {
    mockedVerify.mockResolvedValue({
      isStoreAdmin: false,
      storeId: null,
      userId: null,
      error: 'No authenticated',
    });
    const handler = vi.fn();
    const wrapped = withStoreAdmin(handler);

    const response = await wrapped(makeRequest(), makeCtx());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'No authenticated' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('corta con 403 y mensaje default si isStoreAdmin es false sin error explícito', async () => {
    mockedVerify.mockResolvedValue({ isStoreAdmin: false, storeId: null, userId: null, error: null });
    const wrapped = withStoreAdmin(vi.fn());

    const response = await wrapped(makeRequest(), makeCtx());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden: Admin access required' });
  });

  it('corta con 403 si isStoreAdmin es true pero storeId o userId vinieron null', async () => {
    mockedVerify.mockResolvedValue({ isStoreAdmin: true, storeId: null, userId: 'user-1', error: null });
    const handler = vi.fn();
    const wrapped = withStoreAdmin(handler);

    const response = await wrapped(makeRequest(), makeCtx());

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('llama al handler con { storeId, userId } resueltos, y le pasa el ctx tal cual', async () => {
    mockedVerify.mockResolvedValue({ isStoreAdmin: true, storeId: 3, userId: 'user-1', error: null });
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withStoreAdmin<{ id: string }>(handler);
    const ctx = { params: Promise.resolve({ store: 'yo-heladerias', id: '42' }) };
    const request = makeRequest();

    await wrapped(request, ctx);

    expect(handler).toHaveBeenCalledWith(request, { storeId: 3, userId: 'user-1' }, ctx);
  });

  it('devuelve tal cual la Response que arma el handler', async () => {
    mockedVerify.mockResolvedValue({ isStoreAdmin: true, storeId: 3, userId: 'user-1', error: null });
    const handlerResponse = NextResponse.json({ hello: 'world' }, { status: 201 });
    const wrapped = withStoreAdmin(vi.fn().mockResolvedValue(handlerResponse));

    const response = await wrapped(makeRequest(), makeCtx());

    expect(response).toBe(handlerResponse);
  });
});
