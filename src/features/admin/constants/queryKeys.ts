import { productKeys } from '@/constants/queryKeys';

export const adminKeys = {
  all: ['admin'] as const,
  products: () => productKeys.all,
  productsList: () => productKeys.list({ includeInactive: true }),
  productDetail: (id: number) => productKeys.detail(id),

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

  // Clients query keys
  clients: () => [...adminKeys.all, 'clients'] as const,
  clientsList: () => [...adminKeys.clients(), 'list'] as const,

  // Payments query keys
  payments: () => [...adminKeys.all, 'payments'] as const,
  orderPayments: (orderId: number) => [...adminKeys.payments(), orderId] as const,

  // Dashboard query keys
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  dashboardStockByCategory: () => [...adminKeys.dashboard(), 'stock-by-category'] as const,
  dashboardStockProducts: (category: string) => [...adminKeys.dashboard(), 'stock-products', category] as const,
  dashboardRotation: (days: number) => [...adminKeys.dashboard(), 'rotation', days] as const,
  dashboardRotationSnapshots: (productId: number) => [...adminKeys.dashboard(), 'rotation-snapshots', productId] as const,

  // Ranking query keys
  ranking: () => [...adminKeys.all, 'ranking'] as const,
  topProducts: (params: object) => [...adminKeys.ranking(), 'products', params] as const,
  topCategories: (params: object) => [...adminKeys.ranking(), 'categories', params] as const,
};
