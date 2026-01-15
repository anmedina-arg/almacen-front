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
}
