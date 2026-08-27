import { useCallback } from 'react';
import { create } from 'zustand';
import type { CartItem, VariedadSelection } from '../types';
import type { Product } from '@/types';
import {
  isProductByWeight,
  getQuantityPerClick,
  getUnitPrice,
  calculateItemPrice,
} from '../utils/productUtils';

let lineIdCounter = 0;
function nextLineId(): string {
  lineIdCounter += 1;
  return `line-${Date.now()}-${lineIdCounter}`;
}

// Unidades de un Producto Surtido, marcadas por "+" pero todavía sin elegir
// Variedades — no son líneas de carrito (#94, ADR-0010). Se guarda
// productName acá (no solo el id) para poder armar el aviso de bloqueo de
// envío ("Te faltan elegir sabores para <nombre>") sin tener que ir a
// buscar el producto en otro lado.
export interface PendingSurtidoEntry {
  productId: number;
  productName: string;
  count: number;
}

export interface ConfirmSurtidoResult {
  success: boolean;
  error?: string;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  pendingSurtido: PendingSurtidoEntry[];
}

interface CartActions {
  addToCart: (product: Product) => void;
  addSuggestedItem: (product: Product) => void;
  removeFromCart: (product: Product) => void;
  clearCart: () => void;
  updateQuantity: (productId: number, quantity: number) => void;

  // Producto Surtido (#94) — ver ADR-0010 para el flujo en dos pasos.
  stagePendingSurtidoUnit: (product: Product) => void;
  removeSurtidoUnit: (product: Product) => void;
  confirmSurtidoUnits: (
    product: Product,
    selections: VariedadSelection[][]
  ) => ConfirmSurtidoResult;
}

export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  totalItems: 0,
  totalPrice: 0,
  pendingSurtido: [],

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
        lineId: nextLineId(),
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

  // Like addToCart but marks the item as from_suggestion = true.
  // If already in cart (added organically), does NOT overwrite the flag.
  addSuggestedItem: (product) => {
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
        // Already in cart — just increase quantity, preserve existing from_suggestion flag
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
        lineId: nextLineId(),
        name: product.name,
        price: product.price,
        quantity,
        unitPrice: getUnitPrice(product),
        isByWeight: isProductByWeight(product),
        saleType: product.sale_type,
        from_suggestion: true,
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

  clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0, pendingSurtido: [] }),

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

  // "+" en la card de un Producto Surtido: stagea una unidad pendiente de
  // configurar, sin tocar el carrito todavía (#94, ADR-0010).
  stagePendingSurtidoUnit: (product) => {
    set((state) => {
      const confirmedCount = state.items
        .filter((i) => i.id === product.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      const pendingEntry = state.pendingSurtido.find((p) => p.productId === product.id);
      const pendingCount = pendingEntry?.count ?? 0;

      if (
        product.stock_quantity !== undefined &&
        (product.stock_quantity === 0 || confirmedCount + pendingCount >= product.stock_quantity)
      ) {
        return state;
      }

      if (pendingEntry) {
        return {
          pendingSurtido: state.pendingSurtido.map((p) =>
            p.productId === product.id ? { ...p, count: p.count + 1 } : p
          ),
        };
      }

      return {
        pendingSurtido: [
          ...state.pendingSurtido,
          { productId: product.id, productName: product.name, count: 1 },
        ],
      };
    });
  },

  // "-" en la card de un Producto Surtido: si hay unidades pendientes sin
  // configurar, descarta la más reciente primero (nunca tocó el carrito,
  // no hace falta abrir el modal). Si no hay pendientes, quita directamente
  // la última línea confirmada — tal como pide el AC de #94.
  removeSurtidoUnit: (product) => {
    set((state) => {
      const pendingEntry = state.pendingSurtido.find((p) => p.productId === product.id);
      if (pendingEntry && pendingEntry.count > 0) {
        const newCount = pendingEntry.count - 1;
        return {
          pendingSurtido:
            newCount === 0
              ? state.pendingSurtido.filter((p) => p.productId !== product.id)
              : state.pendingSurtido.map((p) =>
                  p.productId === product.id ? { ...p, count: newCount } : p
                ),
        };
      }

      const lines = state.items.filter((i) => i.id === product.id);
      if (lines.length === 0) return state;
      const lastLine = lines[lines.length - 1];

      return {
        items: state.items.filter((i) => i.lineId !== lastLine.lineId),
        totalItems: state.totalItems - lastLine.quantity,
        totalPrice: state.totalPrice - calculateItemPrice(lastLine),
      };
    });
  },

  // Único punto donde las unidades pendientes de un Producto Surtido pasan
  // a ser líneas reales del carrito (modal "Elegir sabores", #94). Valida
  // mínimo/máximo y ausencia de repetidos por unidad antes de mutar nada —
  // si algo es inválido, el estado queda intacto y se devuelve el motivo.
  //
  // Reemplaza TODAS las líneas existentes de ese producto por el set nuevo
  // (nunca las fusiona): esto es lo que permite reabrir "Elegir sabores"
  // sobre líneas ya confirmadas y editarlas, y también lo que permite que
  // dos unidades con combinación idéntica queden como dos líneas separadas.
  confirmSurtidoUnits: (product, selections) => {
    const min = product.min_variedades ?? 1;
    const max = product.max_variedades ?? Infinity;

    for (const unit of selections) {
      const ids = unit.map((v) => v.id);
      if (new Set(ids).size !== ids.length) {
        return {
          success: false,
          error: 'No podés repetir la misma Variedad dentro de la misma unidad',
        };
      }
      if (unit.length < min || unit.length > max) {
        return {
          success: false,
          error:
            min === max
              ? `Elegí exactamente ${min} Variedad${min === 1 ? '' : 'es'} por unidad`
              : `Elegí entre ${min} y ${max} Variedades por unidad`,
        };
      }
    }

    set((state) => {
      const otherItems = state.items.filter((i) => i.id !== product.id);
      const removedLines = state.items.filter((i) => i.id === product.id);
      const removedQuantity = removedLines.reduce((sum, i) => sum + i.quantity, 0);
      const removedTotal = removedLines.reduce((sum, i) => sum + calculateItemPrice(i), 0);

      const newLines: CartItem[] = selections.map((variedades) => ({
        id: product.id,
        lineId: nextLineId(),
        name: product.name,
        price: product.price,
        quantity: 1,
        unitPrice: getUnitPrice(product),
        isByWeight: isProductByWeight(product),
        saleType: product.sale_type,
        variedades,
      }));
      const addedQuantity = newLines.length;
      const addedTotal = newLines.reduce((sum, i) => sum + calculateItemPrice(i), 0);

      return {
        items: [...otherItems, ...newLines],
        totalItems: state.totalItems - removedQuantity + addedQuantity,
        totalPrice: state.totalPrice - removedTotal + addedTotal,
        pendingSurtido: state.pendingSurtido.filter((p) => p.productId !== product.id),
      };
    });

    return { success: true };
  },
}));

// Granular selectors
export const useCartItems = () => useCartStore((s) => s.items);

export function useCartItemQuantity(productId: number) {
  const selector = useCallback(
    (s: CartStore) =>
      s.items
        .filter((i) => i.id === productId)
        .reduce((sum, i) => sum + i.quantity, 0),
    [productId]
  );
  return useCartStore(selector);
}

export function usePendingSurtidoCount(productId: number) {
  const selector = useCallback(
    (s: CartStore) => s.pendingSurtido.find((p) => p.productId === productId)?.count ?? 0,
    [productId]
  );
  return useCartStore(selector);
}

export function useUnconfirmedSurtidoProducts() {
  return useCartStore((s) => s.pendingSurtido.filter((p) => p.count > 0));
}

export function useSurtidoLines(productId: number) {
  const selector = useCallback(
    (s: CartStore) => s.items.filter((i) => i.id === productId),
    [productId]
  );
  return useCartStore(selector);
}
