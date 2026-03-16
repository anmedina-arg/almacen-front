import { create } from 'zustand';
import type { CartItem } from '../types';
import type { Product } from '@/types';
import {
  isProductByWeight,
  getQuantityPerClick,
  getUnitPrice,
} from '../utils/productUtils';

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

interface CartActions {
  addToCart: (product: Product) => void;
  removeFromCart: (product: Product) => void;
  clearCart: () => void;
  updateQuantity: (productId: number, quantity: number) => void;
}

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,

  addToCart: (product) => {
    const quantity = getQuantityPerClick(product);
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id);

      if (product.stock_quantity !== undefined) {
        const currentQty = existing?.quantity ?? 0;
        if (product.stock_quantity === 0 || currentQty >= product.stock_quantity) {
          return state;
        }
      }

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
          totalItems: state.totalItems + quantity,
          totalPrice: state.totalPrice + quantity * getUnitPrice(product),
        };
      }

      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        unitPrice: getUnitPrice(product),
        isByWeight: isProductByWeight(product),
        saleType: product.sale_type,
      };

      return {
        items: [...state.items, newItem],
        totalItems: state.totalItems + quantity,
        totalPrice: state.totalPrice + quantity * getUnitPrice(product),
      };
    });
  },

  removeFromCart: (product) => {
    const quantity = getQuantityPerClick(product);
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id);
      if (!existing) return state;

      if (existing.quantity <= quantity) {
        return {
          items: state.items.filter((i) => i.id !== product.id),
          totalItems: state.totalItems - existing.quantity,
          totalPrice: state.totalPrice - existing.quantity * getUnitPrice(product),
        };
      }

      return {
        items: state.items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity - quantity }
            : item
        ),
        totalItems: state.totalItems - quantity,
        totalPrice: state.totalPrice - quantity * getUnitPrice(product),
      };
    });
  },

  clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === productId);
      if (!existing) return state;
      const diff = quantity - existing.quantity;
      return {
        items: state.items.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        ),
        totalItems: state.totalItems + diff,
        totalPrice: state.totalPrice + diff * existing.unitPrice,
      };
    }),
}));

// Granular selectors
export const useCartItems = () => useCartStore((s) => s.items);
export const useCartItemQuantity = (productId: number) =>
  useCartStore((s) => s.items.find((i) => i.id === productId)?.quantity ?? 0);
