import { fetchCategoriesWithSubs } from '../services/fetchCategoriesWithSubs';
import { FilterButtons } from './FilterButtons';

export default async function CategoryNav() {
  const categories = await fetchCategoriesWithSubs();

  return (
    <div className="p-1 mt-0 bg-white/80 backdrop-blur-md">
      <FilterButtons categories={categories} />
    </div>
  );
}
