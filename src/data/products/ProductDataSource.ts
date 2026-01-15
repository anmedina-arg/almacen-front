import { Product } from '@/types';

export interface ProductDataSource {
  getAll(): Promise<Product[]>;
}
