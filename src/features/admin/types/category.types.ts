export interface Category {
  id: number;
  name: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: number;
  name: string;
  category_id: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}
