import { Product } from '@/types';

export interface ProductDataSource {
  getAll(): Promise<Product[]>;
  getActive(): Promise<Product[]>;
  getById(id: number): Promise<Product | null>;
  create(product: Omit<Product, 'id'>): Promise<Product>;
  update(id: number, updates: Partial<Product>): Promise<Product | null>;
  delete(id: number): Promise<boolean>;
  toggleActive(id: number): Promise<Product | null>;
}
