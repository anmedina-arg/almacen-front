export interface ComboComponent {
  id?: number;
  combo_product_id?: number;
  component_product_id: number;
  component_product_name?: string | null;
  component_product_price?: number | null;
  component_product_cost?: number | null;
  quantity: number;
}
