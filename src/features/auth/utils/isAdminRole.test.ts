import { describe, expect, it } from 'vitest';
import { isAdminRole } from './isAdminRole';

// Predicado compartido (#43): único punto de verdad para "¿puede este
// usuario administrar esta Store?", reusado por resolveStoreAdminStatus
// (server) y HeaderClient (cliente) — antes cada uno reimplementaba esta
// misma decisión por su cuenta.
describe('isAdminRole', () => {
  it('sin rol y sin membership: false', () => {
    expect(isAdminRole(null, false)).toBe(false);
    expect(isAdminRole(undefined, false)).toBe(false);
  });

  it('Store admin: sin super_admin pero con membership → true', () => {
    expect(isAdminRole('user', true)).toBe(true);
  });

  it('Platform admin: super_admin sin membership → true', () => {
    expect(isAdminRole('super_admin', false)).toBe(true);
  });

  it('rol inválido y sin membership: false', () => {
    expect(isAdminRole('admin', false)).toBe(false);
    expect(isAdminRole('algo-random', false)).toBe(false);
  });
});
