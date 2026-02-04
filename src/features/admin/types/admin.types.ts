import { Product } from '@/types';

export interface AdminProductFilters {
  search: string;
  activeFilter: 'all' | 'active' | 'inactive';
}

export interface ProductFormMode {
  mode: 'create' | 'edit';
  product?: Product;
}
