import { WeightType } from '@/types';

export const formatQuantity = (
  quantity: number,
  weightType: WeightType,
): string => {
  switch (weightType) {
    case 'kg':
      if (quantity >= 1000) {
        return `${quantity / 1000}kg`;
      } else {
        return `${quantity}gr`;
      }
    case '100gr':
      return `${quantity}gr`;
    case 'unit':
      return quantity.toString();
    default:
      return quantity.toString();
  }
};
