import { Product } from '@/domain/product';

export interface ProductsDataSource {
  getAll(): Promise<Product[]>;
}
