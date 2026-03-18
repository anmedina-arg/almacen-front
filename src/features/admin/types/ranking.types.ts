export type RankingPeriod = 'today' | 'week' | 'month' | 'custom';
export type RankingMetric = 'units' | 'revenue';

export interface TopProduct {
  product_id: number;
  product_name: string;
  product_image: string | null;
  sale_type: 'unit' | 'kg' | '100gr';
  category_name: string | null;
  units_sold: number;
  revenue: number;
  current_price: number;
  current_cost: number;
  margin: number;
  margin_pct: number | null;
}

export type RankingLevel = 'product' | 'category';

export interface TopProductsParams {
  startDate: string | null;  // ISO string
  endDate: string | null;    // ISO string
  limit: number;
  categoryId: number | null;
  metric: RankingMetric;
}

export interface TopCategory {
  category_id: number | null;
  category_name: string;
  revenue: number;
}

export interface TopCategoriesParams {
  startDate: string | null;
  endDate: string | null;
  limit: number;
}
