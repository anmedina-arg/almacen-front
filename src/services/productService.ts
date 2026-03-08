import type { Product } from '@/types';

export const productService = {
  async fetchProducts(options?: { includeInactive?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams();
    if (options?.includeInactive) params.set('includeInactive', 'true');

    const res = await fetch(`/api/products${params.size ? `?${params}` : ''}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Error al obtener productos');
    }

    return res.json();
  },
};
