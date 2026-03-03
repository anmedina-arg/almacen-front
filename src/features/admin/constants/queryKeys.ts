export const adminKeys = {
  all: ['admin'] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  productsList: () => [...adminKeys.products(), 'list'] as const,
  productDetail: (id: number) => [...adminKeys.products(), id] as const,

  // Stock query keys
  stock: () => [...adminKeys.all, 'stock'] as const,
  stockList: () => [...adminKeys.stock(), 'list'] as const,
  stockHistory: (productId: number) => [...adminKeys.stock(), 'history', productId] as const,
  lowStock: () => [...adminKeys.stock(), 'low-stock'] as const,

  // Orders query keys
  orders: () => [...adminKeys.all, 'orders'] as const,
  ordersList: () => [...adminKeys.orders(), 'list'] as const,
  orderDetail: (id: number) => [...adminKeys.orders(), id] as const,

  // Combo query keys
  comboComponents: (id: number | null) => [...adminKeys.all, 'combo-components', id] as const,

  // Categories query keys
  categories: () => [...adminKeys.all, 'categories'] as const,
  categoriesList: () => [...adminKeys.categories(), 'list'] as const,
  categorySubcategories: (id: number) => [...adminKeys.categories(), 'subcategories', id] as const,
};
