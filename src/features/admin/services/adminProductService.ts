import { Product } from '@/types';
import { apiFetch } from '@/lib/api/apiFetch';

/**
 * `error.error` puede ser un string (la mayoría de las rutas) o el shape de
 * z.flatten() (rutas migradas a la capa de servicios, ver #115/#116:
 * `{ error: parsed.error.flatten() }` en un 400) — sin esto, `new
 * Error(objeto)` termina mostrando el `[object Object]` de
 * String(objeto) en vez de un mensaje legible.
 */
function extractErrorMessage(body: unknown, fallback: string): string {
  const error = (body as { error?: unknown } | undefined)?.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const flattened = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const firstFieldError = flattened.fieldErrors
      ? Object.values(flattened.fieldErrors).flat()[0]
      : undefined;
    return flattened.formErrors?.[0] || firstFieldError || fallback;
  }
  return fallback;
}

export const adminProductService = {
  async getById(id: number): Promise<Product> {
    const res = await apiFetch(`/products/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Failed to fetch product'));
    }
    return res.json();
  },

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const res = await apiFetch('/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Failed to create product'));
    }
    return res.json();
  },

  async update(id: number, updates: Partial<Product>): Promise<Product> {
    const res = await apiFetch(`/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(extractErrorMessage(error, 'Failed to update product'));
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await apiFetch(`/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete product');
    }
  },
};
