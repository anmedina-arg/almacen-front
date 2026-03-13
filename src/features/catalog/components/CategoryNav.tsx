import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FilterButtons } from './FilterButtons';
import type { CategoryWithSubsPublic } from '../types/category.types';

export default async function CategoryNav() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('categories')
    .select('id, name, image_url, subcategories(id, name)')
    .order('name', { ascending: true });

  const categories: CategoryWithSubsPublic[] = (data as CategoryWithSubsPublic[]) ?? [];

  return (
    <div className="p-1 mt-0 sticky top-9 z-50 bg-white/80 backdrop-blur-md transition-all duration-300">
      <span className="flex justify-end w-full text-sm text-gray-700 px-4">
        más categorías 👉
      </span>
      <FilterButtons categories={categories} />
    </div>
  );
}
