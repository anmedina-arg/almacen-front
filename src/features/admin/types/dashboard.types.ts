import type { Order } from './order.types';

/**
 * Tipos del dominio Dashboard (#126) — antes vivían inline en cada
 * route.ts (src/app/[store]/api/dashboard/*), con el cliente HTTP
 * importándolos directo desde ahí. Movidos acá para que sobrevivan a que
 * las rutas dejen de ser el dueño de la lógica (delegada a
 * dashboardService, features/dashboard/services/).
 */

export interface PendingPaymentsResponse {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RotationItem {
  id: number;
  name: string;
  category_name: string;
  sale_type: string;
  units_sold: number;
  avg_stock: number;
  rotation: number;
}

export interface StockSnapshotItem {
  date: string;
  stock: number | null;
  movement_type: string | null;
}

export interface StockByCategoryItem {
  category_name: string;
  total_value: number;
}

export interface StockProductItem {
  id: number;
  name: string;
  sale_type: string;
  stock_raw: number; // grams for kg/100gr, units otherwise
  cost: number; // cost per kg / per 100gr / per unit
  stock_value: number; // stock_raw converted * cost
}

export interface StockValueDayItem {
  date: string; // 'YYYY-MM-DD'
  category: string;
  value: number;
}

export interface StockValueHistoryResponse {
  items: StockValueDayItem[];
  categories: string[]; // ordenadas por valor total desc (para asignación consistente de colores)
  dates: string[]; // ordenadas ASC
}
