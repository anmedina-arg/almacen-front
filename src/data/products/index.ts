import { ApiProductDataSource } from './ApiProductDataSource';
import { ProductDataSource } from './ProductDataSource';

export const productDataSource: ProductDataSource = new ApiProductDataSource();
