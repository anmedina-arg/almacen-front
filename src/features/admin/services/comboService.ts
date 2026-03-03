import type { ComboComponent } from '../types/combo.types';

export const comboService = {
  async getComponents(productId: number): Promise<ComboComponent[]> {
    const res = await fetch(`/api/combos/${productId}/components`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch combo components');
    }
    return res.json();
  },

  async updateComponents(
    productId: number,
    components: { component_product_id: number; quantity: number }[]
  ): Promise<void> {
    const res = await fetch(`/api/combos/${productId}/components`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ components }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update combo components');
    }
  },
};
