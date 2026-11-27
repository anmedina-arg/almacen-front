import { describe, expect, it } from 'vitest';
import {
  createOrderSubmitGuard,
  generateIdempotencyKey,
  IDEMPOTENCY_KEY_TTL_MS,
  SUBMIT_LOCK_TIMEOUT_MS,
} from './orderSubmitGuard';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sequentialKeys() {
  let n = 0;
  return () => `key-${++n}`;
}

describe('createOrderSubmitGuard (#193)', () => {
  it('mientras hay un envío en vuelo, un segundo begin() devuelve null', () => {
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys() });
    expect(guard.begin('carrito-A')?.key).toBe('key-1');
    expect(guard.begin('carrito-A')).toBeNull();
  });

  it('tras un envío exitoso libera el candado y el siguiente pedido usa otra clave', () => {
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys() });
    guard.begin('carrito-A')!.succeeded();
    expect(guard.begin('carrito-A')?.key).toBe('key-2');
  });

  it('tras un error libera el candado y reintentar el mismo carrito conserva la clave', () => {
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys() });
    guard.begin('carrito-A')!.failed();
    expect(guard.begin('carrito-A')?.key).toBe('key-1');
  });

  it('tras un error, si el carrito cambió, usa una clave nueva', () => {
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys() });
    guard.begin('carrito-A')!.failed();
    expect(guard.begin('carrito-B')?.key).toBe('key-2');
  });

  it('un envío que nunca termina no bloquea para siempre: pasado el tope libera con la misma clave', () => {
    let time = 1_000;
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys(), now: () => time });
    expect(guard.begin('carrito-A')?.key).toBe('key-1');

    time += SUBMIT_LOCK_TIMEOUT_MS - 1;
    expect(guard.begin('carrito-A')).toBeNull();

    time += 1;
    expect(guard.begin('carrito-A')?.key).toBe('key-1');
  });

  it('la respuesta tardía de un intento vencido no libera el candado del intento vigente', () => {
    let time = 1_000;
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys(), now: () => time });
    const first = guard.begin('carrito-A')!;

    time += SUBMIT_LOCK_TIMEOUT_MS;
    const second = guard.begin('carrito-A')!;
    expect(second.key).toBe(first.key);

    first.failed();
    expect(guard.begin('carrito-A')).toBeNull();

    // Ni siquiera un éxito tardío del primero le borra la clave al segundo.
    first.succeeded();
    expect(guard.begin('carrito-A')).toBeNull();

    second.failed();
    expect(guard.begin('carrito-A')?.key).toBe(first.key);
  });

  it('una clave vieja no se reusa: pasado el tiempo de vida, el mismo carrito recibe clave nueva', () => {
    let time = 1_000;
    const guard = createOrderSubmitGuard({ newKey: sequentialKeys(), now: () => time });
    guard.begin('carrito-A')!.failed();

    time += IDEMPOTENCY_KEY_TTL_MS - 1;
    const stillValid = guard.begin('carrito-A')!;
    expect(stillValid.key).toBe('key-1');
    stillValid.failed();

    time += 1;
    expect(guard.begin('carrito-A')?.key).toBe('key-2');
  });
});

describe('generateIdempotencyKey (#193)', () => {
  it('devuelve un UUID v4 distinto cada vez', () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });

  it('sin crypto.randomUUID (Safari viejo) igual devuelve un UUID v4 válido', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: (bytes: Uint8Array) => bytes.map((_, i) => (i * 37 + 11) % 256) },
      configurable: true,
    });
    try {
      expect(generateIdempotencyKey()).toMatch(UUID_V4);
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});
