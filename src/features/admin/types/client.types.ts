export type Barrio = 'AC1' | 'AC2' | 'otros';

export interface Client {
  id: number;
  barrio: Barrio;
  manzana_lote: string | null;
  display_code: string;
  created_at: string;
}

export interface AssignClientInput {
  barrio: Barrio;
  manzana_lote?: string;
}
