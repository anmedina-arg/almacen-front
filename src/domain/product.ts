export type MainCategory =
  | 'panaderia'
  | 'congelados'
  | 'combos'
  | 'snaks'
  | 'otros'
  | 'bebidas'
  | 'lacteos'
  | 'almacen'
  | 'fiambres'
  | 'pizzas';

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  active: boolean;
  categories: string;
  mainCategory: MainCategory;
}
