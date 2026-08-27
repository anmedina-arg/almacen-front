export interface Familia {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Variedad {
  id: number;
  name: string;
  familia_id: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamiliaWithVariedades extends Familia {
  variedades: Variedad[];
}
