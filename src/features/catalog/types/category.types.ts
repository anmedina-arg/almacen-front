export interface SubcategoryPublic {
  id: number;
  name: string;
  sort_order: number;
}

export interface CategoryWithSubsPublic {
  id: number;
  name: string;
  image_url?: string | null;
  sort_order: number;
  subcategories: SubcategoryPublic[];
}
