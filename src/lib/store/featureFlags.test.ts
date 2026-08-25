import { describe, expect, it } from 'vitest';
import { FEATURE_FLAG_KEYS, resolveFeatureFlags } from './featureFlags';

describe('resolveFeatureFlags', () => {
  it('devuelve las 8 keys en true cuando el JSONB las tiene todas en true', () => {
    const raw = Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, true]));
    const flags = resolveFeatureFlags(raw);
    for (const key of FEATURE_FLAG_KEYS) {
      expect(flags[key]).toBe(true);
    }
  });

  it('resuelve a false cualquier key faltante', () => {
    const flags = resolveFeatureFlags({ stock: true });
    expect(flags.stock).toBe(true);
    expect(flags.combos).toBe(false);
    expect(flags.pos).toBe(false);
  });

  it('resuelve todas las keys a false cuando el JSONB es un objeto vacío ({})', () => {
    const flags = resolveFeatureFlags({});
    for (const key of FEATURE_FLAG_KEYS) {
      expect(flags[key]).toBe(false);
    }
  });

  it('resuelve todas las keys a false cuando raw es null', () => {
    const flags = resolveFeatureFlags(null);
    for (const key of FEATURE_FLAG_KEYS) {
      expect(flags[key]).toBe(false);
    }
  });

  it('resuelve todas las keys a false cuando raw es undefined', () => {
    const flags = resolveFeatureFlags(undefined);
    for (const key of FEATURE_FLAG_KEYS) {
      expect(flags[key]).toBe(false);
    }
  });

  it('trata un valor no-boolean (ej. string "true") como false — solo el boolean literal cuenta', () => {
    const flags = resolveFeatureFlags({ stock: 'true', combos: 1 });
    expect(flags.stock).toBe(false);
    expect(flags.combos).toBe(false);
  });

  it('ignora keys extra que no están en el catálogo', () => {
    const flags = resolveFeatureFlags({ stock: true, algoQueNoExiste: true });
    expect(flags.stock).toBe(true);
    expect(flags).not.toHaveProperty('algoQueNoExiste');
  });
});
