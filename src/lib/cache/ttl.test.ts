import { describe, expect, it } from 'vitest';
import { TOP_SELLER_CACHE_SECONDS } from './ttl';

describe('TOP_SELLER_CACHE_SECONDS (#147)', () => {
  it('es 24 horas en segundos', () => {
    expect(TOP_SELLER_CACHE_SECONDS).toBe(24 * 60 * 60);
  });
});
