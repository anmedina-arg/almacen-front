import { ProductsDataSource } from '../products.datasource';
import { Product } from '@/domain/product';

export const localProductsDataSource: ProductsDataSource = {
  async getAll(): Promise<Product[]> {
    const mod = await import('@/data/mockdata_fixed_ids');
    return mod.products;
  },
};
