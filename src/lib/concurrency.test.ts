import { describe, expect, it } from 'vitest';
import { mapWithConcurrencyLimit } from './concurrency';

describe('mapWithConcurrencyLimit (#146)', () => {
  it('devuelve los resultados en el mismo orden que los items de entrada', async () => {
    const items = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = await mapWithConcurrencyLimit(items, 3, async (n) => n * 2);
    expect(result).toEqual(items.map((n) => n * 2));
  });

  it('nunca corre más de `limit` llamadas en simultáneo', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrencyLimit(items, 4, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return n;
    });

    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  it('funciona con una lista vacía', async () => {
    const result = await mapWithConcurrencyLimit([], 5, async (n: number) => n);
    expect(result).toEqual([]);
  });

  it('funciona con limit mayor a la cantidad de items', async () => {
    const result = await mapWithConcurrencyLimit([1, 2], 10, async (n) => n + 1);
    expect(result).toEqual([2, 3]);
  });
});
