const priceFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export const formatPrice = (price: number): string => {
  return priceFormatter.format(price);
};
