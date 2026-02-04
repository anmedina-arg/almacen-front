export const adminKeys = {
  all: ['admin'] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  productsList: () => [...adminKeys.products(), 'list'] as const,
  productDetail: (id: number) => [...adminKeys.products(), id] as const,
};
