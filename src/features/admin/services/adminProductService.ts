import { Product } from '@/types';

export const adminProductService = {
  async getAll(): Promise<Product[]> {
    const res = await fetch('/api/products?includeInactive=true', {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch products');
    }
    return res.json();
  },

  async getById(id: number): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch product');
    }
    return res.json();
  },

  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create product');
    }
    return res.json();
  },

  async update(id: number, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update product');
    }
    return res.json();
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete product');
    }
  },
};
