import { ProductsDataSource } from './products.datasource';
import { localProductsDataSource } from './local/products.local.datasource';

export const productsDataSource: ProductsDataSource = localProductsDataSource;
