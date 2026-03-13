export interface SubcategoryPublic {
  id: number;
  name: string;
}

export interface CategoryWithSubsPublic {
  id: number;
  name: string;
  image_url?: string | null;
  subcategories: SubcategoryPublic[];
}
