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
};
