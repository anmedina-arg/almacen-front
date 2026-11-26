import { describe, expect, it } from 'vitest';
import { createProductSchema, updateProductSchema } from './productSchemas';

// #181: la columna legacy de texto libre `categories` salió del flujo de la
// API. Crear y editar un producto no la pide, y un cliente viejo que todavía
// la mande no rompe nada pero tampoco llega a la base.
const nuevo = { name: 'Coca Cola 1.5 L', price: 3500, category_id: 1 };

describe('createProductSchema — sin la columna legacy categories (#181)', () => {
  it('acepta un producto sin `categories` y no la agrega al resultado', () => {
    const result = createProductSchema.safeParse(nuevo);
    expect(result.success).toBe(true);
    expect(result.success && 'categories' in result.data).toBe(false);
  });

  it('si un cliente viejo todavía la manda, no falla y se descarta', () => {
    const result = createProductSchema.safeParse({ ...nuevo, categories: 'Gaseosas' });
    expect(result.success).toBe(true);
    expect(result.success && 'categories' in result.data).toBe(false);
  });
});

describe('updateProductSchema — sin la columna legacy categories (#181)', () => {
  it('acepta editar el precio sin `categories` y no la agrega al resultado', () => {
    const result = updateProductSchema.safeParse({ price: 3600 });
    expect(result.success).toBe(true);
    expect(result.success && 'categories' in result.data).toBe(false);
  });

  it('si un cliente viejo todavía la manda, no falla y se descarta', () => {
    const result = updateProductSchema.safeParse({ price: 3600, categories: 'Gaseosas' });
    expect(result.success).toBe(true);
    expect(result.success && 'categories' in result.data).toBe(false);
  });
});
