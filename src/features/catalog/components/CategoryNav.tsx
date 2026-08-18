import { fetchCategoriesWithSubs } from '../services/fetchCategoriesWithSubs';
import { FilterButtons } from './FilterButtons';

export default async function CategoryNav({ storeId }: { storeId: number }) {
  const categories = await fetchCategoriesWithSubs(storeId);

  return (
    <div className="p-1 mt-0 bg-white/80 backdrop-blur-md">
      <FilterButtons categories={categories} />
    </div>
  );
}
