import { useReducer, useCallback, useMemo } from 'react';
import { CartState, CartAction, Product, CartItem } from '@/types';
import {
  isProductByWeight,
  getQuantityPerClick,
  getUnitPrice,
} from '@/utils/productUtils';

// Estado inicial del carrito
const initialState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

// Reducer para manejar las acciones del carrito
const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === product.id);

      if (existingItem) {
        // Si ya existe, aumentar cantidad
        const updatedItems = state.items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );

        return {
          ...state,
          items: updatedItems,
          totalItems: state.totalItems + quantity,
          totalPrice: state.totalPrice + quantity * getUnitPrice(product),
        };
      } else {
        // Si no existe, agregar nuevo item
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          unitPrice: getUnitPrice(product),
          isByWeight: isProductByWeight(product.name),
        };

        return {
          ...state,
          items: [...state.items, newItem],
          totalItems: state.totalItems + quantity,
          totalPrice: state.totalPrice + quantity * getUnitPrice(product),
        };
      }
    }

    case 'REMOVE_ITEM': {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === product.id);

      if (!existingItem) return state;

      if (existingItem.quantity <= quantity) {
        // Si la cantidad es menor o igual, eliminar el item
        const updatedItems = state.items.filter(
          (item) => item.id !== product.id
        );
        return {
          ...state,
          items: updatedItems,
          totalItems: state.totalItems - existingItem.quantity,
          totalPrice:
            state.totalPrice - existingItem.quantity * getUnitPrice(product),
        };
      } else {
        // Si hay más cantidad, reducir
        const updatedItems = state.items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity - quantity }
            : item
        );

        return {
          ...state,
          items: updatedItems,
          totalItems: state.totalItems - quantity,
          totalPrice: state.totalPrice - quantity * getUnitPrice(product),
        };
      }
    }

    case 'CLEAR_CART':
      return initialState;

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === productId);

      if (!existingItem) return state;

      const quantityDiff = quantity - existingItem.quantity;

      const updatedItems = state.items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );

      return {
        ...state,
        items: updatedItems,
        totalItems: state.totalItems + quantityDiff,
        totalPrice: state.totalPrice + quantityDiff * existingItem.unitPrice,
      };
    }

    default:
      return state;
  }
};

/**
 * Hook personalizado para manejar el carrito de compras
 */
export const useCart = () => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Función para agregar producto al carrito
  const addToCart = useCallback((product: Product) => {
    const quantity = getQuantityPerClick(product.name);
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
  }, []);

  // Función para quitar producto del carrito
  const removeFromCart = useCallback((product: Product) => {
    const quantity = getQuantityPerClick(product.name);
    dispatch({ type: 'REMOVE_ITEM', payload: { product, quantity } });
  }, []);

  // Función para limpiar el carrito
  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // Función para obtener la cantidad de un producto
  const getItemQuantity = useCallback(
    (productId: number): number => {
      const item = state.items.find((item) => item.id === productId);
      return item ? item.quantity : 0;
    },
    [state.items]
  );

  // Función para actualizar cantidad directamente
  const updateQuantity = useCallback((productId: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  }, []);

  // Memoizar valores calculados
  const cartValue = useMemo(
    () => ({
      state,
      addToCart,
      removeFromCart,
      clearCart,
      getItemQuantity,
      updateQuantity,
    }),
    [
      state,
      addToCart,
      removeFromCart,
      clearCart,
      getItemQuantity,
      updateQuantity,
    ]
  );

  return cartValue;
};
