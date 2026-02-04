import { Product } from '@/types';
import { ProductDataSource } from './ProductDataSource';

export class ApiProductDataSource implements ProductDataSource {
  async getAll(): Promise<Product[]> {
    const res = await fetch('/api/products', {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }

    return res.json();
  }

  async getActive(): Promise<Product[]> {
    const res = await fetch('/api/products', {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch active products');
    }

    const allProducts: Product[] = await res.json();
    return allProducts.filter(p => p.active);
  }

  async getById(id: number): Promise<Product | null> {
    const res = await fetch(`/api/products/${id}`, {
      cache: 'no-store',
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error('Failed to fetch product');
    }

    return res.json();
  }

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
  }

  async update(id: number, updates: Partial<Product>): Promise<Product | null> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update product');
    }

    return res.json();
  }

  async delete(id: number): Promise<boolean> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete product');
    }

    return true;
  }

  async toggleActive(id: number): Promise<Product | null> {
    // First get the product
    const product = await this.getById(id);
    if (!product) return null;

    // Then update it
    return this.update(id, { active: !product.active });
  }
}
