import type { Product } from './catalog.types';

export interface RecommendedProduct extends Product {
  affinity_score: number;
}

export interface GetRecommendationsParams {
  product_ids: number[];
  exclude_ids?: number[];
  limit?: number;
}
