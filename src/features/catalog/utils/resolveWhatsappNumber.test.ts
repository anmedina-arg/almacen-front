import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveWhatsappNumber } from './resolveWhatsappNumber';

describe('resolveWhatsappNumber', () => {
  const originalEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '5491112345678';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = originalEnv;
  });

  it('usa el número propio de la Store cuando está configurado', () => {
    expect(resolveWhatsappNumber('5493816713512')).toBe('5493816713512');
  });

  it('cae al env var cuando la Store no tiene número propio (null)', () => {
    expect(resolveWhatsappNumber(null)).toBe('5491112345678');
  });

  it('cae al env var cuando la Store tiene string vacío', () => {
    expect(resolveWhatsappNumber('')).toBe('5491112345678');
  });
});
