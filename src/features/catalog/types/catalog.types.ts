//Main categories:
export type MainCategory =
  | 'panaderia'
  | 'congelados'
  | 'combos'
  | 'snaks'
  | 'otros'
  | 'bebidas'
  | 'lacteos'
  | 'almacen'
  | 'fiambres'
  | 'pizzas';

// Tipos base
export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  active: boolean;
  categories: string;
  mainCategory: MainCategory;
  sale_type: WeightType;
  stock_quantity?: number; // undefined = no stock record (treat as available)
  cost?: number | null;
  is_combo?: boolean;
  max_stock?: number | null;
  combo_items?: string[]; // nombres de los componentes, solo para combos
  is_top_seller?: boolean;
  // FK-based category system (Phase 2)
  category_id?: number | null;
  subcategory_id?: number | null;
  category_name?: string | null;    // from JOIN with categories table
  subcategory_name?: string | null; // from JOIN with subcategories table
  // Producto Surtido (#92/#93): se arma eligiendo Variedades de su Familia
  // en vez de venderse tal cual — ver supabase/schema/producto-surtido/.
  is_producto_surtido?: boolean;
  familia_id?: number | null;
  min_variedades?: number | null;
  max_variedades?: number | null;
}

// description esctructurada
export type ProductDescription = Array<{ text: string; subItems?: string[] }>;

// extiendo Product para incluir descripcion
export interface ProductWithDescription extends Product {
  description: ProductDescription;
}

// union de tipos para unificar productos con y sin descripcion
export type ProductWithOptionalDescription = Product | ProductWithDescription;

// Una Variedad elegida para una unidad de Producto Surtido (#94) — nombre
// congelado al momento de elegir, mismo criterio de snapshot que
// order_items.product_name (sobrevive a que la Variedad se deshabilite).
export interface VariedadSelection {
  id: number;
  name: string;
}

export interface CartItem {
  id: number;
  // Identificador único por línea (#94) — un Producto Surtido puede tener
  // varias líneas simultáneas para el mismo product id (una por unidad
  // configurada), que nunca se fusionan aunque compartan combinación de
  // Variedades (ADR-0010). Para productos normales sigue habiendo una sola
  // línea por producto, pero igual necesita lineId para tener una key
  // estable propia en vez de depender de `id`.
  lineId: string;
  name: string;
  price: number;
  quantity: number;
  unitPrice: number;
  isByWeight: boolean;
  saleType: WeightType;
  from_suggestion?: boolean;
  // Solo presente en líneas de Producto Surtido (#94).
  variedades?: VariedadSelection[];
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
  isLoading?: boolean;
  cartProductIds?: number[];
}

// Tipos para utilidades
export interface ProductUtils {
  isProductByWeight: (product: Pick<Product, 'sale_type'>) => boolean;
  getWeightType: (product: Pick<Product, 'sale_type'>) => WeightType;
  getQuantityPerClick: (product: Pick<Product, 'name' | 'sale_type'>) => number;
  getUnitPrice: (product: ProductWithOptionalDescription) => number;
  calculateItemPrice: (item: CartItem) => number;
  truncateProductName: (name: string, maxLength: number) => string;
}

export interface MessageUtils {
  generateWhatsAppMessage: (cartItems: CartItem[]) => string;
  formatQuantity: (quantity: number, weightType: WeightType) => string;
}
