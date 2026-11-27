import { describe, expect, it } from 'vitest';
import { safePlatformAdminRedirect } from './platformAdmin';

describe('safePlatformAdminRedirect (#194)', () => {
  it('respeta un destino dentro de /admin', () => {
    expect(safePlatformAdminRedirect('/admin')).toBe('/admin');
    expect(safePlatformAdminRedirect('/admin/stores/demo-store')).toBe('/admin/stores/demo-store');
  });

  it('sin destino, va al panel', () => {
    expect(safePlatformAdminRedirect(null)).toBe('/admin');
    expect(safePlatformAdminRedirect('')).toBe('/admin');
  });

  it('no deja salir de /admin (open redirect)', () => {
    expect(safePlatformAdminRedirect('https://evil.com')).toBe('/admin');
    expect(safePlatformAdminRedirect('//evil.com/admin')).toBe('/admin');
    expect(safePlatformAdminRedirect('/\\evil.com')).toBe('/admin');
    expect(safePlatformAdminRedirect('/administrador')).toBe('/admin');
    expect(safePlatformAdminRedirect('/market-del-cevil/admin')).toBe('/admin');
    expect(safePlatformAdminRedirect('/admin/../market-del-cevil')).toBe('/admin');
    expect(safePlatformAdminRedirect('/admin/%2e%2e/x')).toBe('/admin');
  });

  it('conserva la query del destino', () => {
    expect(safePlatformAdminRedirect('/admin?tab=flags')).toBe('/admin?tab=flags');
  });

  it('no vuelve al login ni al callback', () => {
    expect(safePlatformAdminRedirect('/admin/auth/callback?code=x')).toBe('/admin');
    expect(safePlatformAdminRedirect('/admin/login')).toBe('/admin');
    expect(safePlatformAdminRedirect('/admin/login?redirectTo=/admin')).toBe('/admin');
  });
});
