// Tipos base
export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  active: boolean;
  categories: string;
  mainCategory: 'panaderia' | 'congelados' | 'combos' | 'otros';
}

// description esctructurada
export type ProductDescription = Array<{ text: string; subItems?: string[] }>;

// extiendo Product para incluir descripción
export interface ProductWithDescription extends Product {
  description: ProductDescription;
}

// union de tipos para unificar productos con y sin descripción
export type ProductWithOptionalDescription = Product | ProductWithDescription;

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unitPrice: number;
  isByWeight: boolean;
}

// Tipos para el sistema de pesos
export type WeightType = '100gr' | 'kg' | 'unit';

export interface WeightConfig {
  type: WeightType;
  quantityPerClick: number;
  unitPrice: number;
}

// Tipos para el mensaje de WhatsApp
export interface WhatsAppMessageConfig {
  quantityWidth: number;
  productWidth: number;
  priceWidth: number;
}

// Tipos para el estado del carrito
export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// Tipos para las acciones del carrito
export type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'CLEAR_CART' }
  | {
      type: 'UPDATE_QUANTITY';
      payload: { productId: number; quantity: number };
    };

// Tipos para el contexto del carrito
export interface CartContextType {
  state: CartState;
  addToCart: (product: Product) => void;
  removeFromCart: (product: Product) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
}

// Tipos para las props de componentes
export interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: (product: Product) => void;
  onRemove: (product: Product) => void;
}

export interface ProductListProps {
  products: Product[];
  categories?: string[];
}

export interface WhatsAppButtonProps {
  cartItems: CartItem[];
  onSendMessage: () => void;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Tipos para utilidades
export interface ProductUtils {
  isProductByWeight: (productName: string) => boolean;
  getWeightType: (productName: string) => WeightType;
  getQuantityPerClick: (productName: string) => number;
  getUnitPrice: (product: Product) => number;
  calculateItemPrice: (item: CartItem) => number;
  truncateProductName: (name: string, maxLength: number) => string;
}

export interface MessageUtils {
  generateWhatsAppMessage: (cartItems: CartItem[]) => string;
  formatQuantity: (quantity: number, weightType: WeightType) => string;
}
