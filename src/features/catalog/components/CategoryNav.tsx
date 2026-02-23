import FilterButtons from './FilterButtons';

export default function CategoryNav() {
  return (
    <div className="p-1 mt-0 sticky top-9 z-50 bg-white/80 backdrop-blur-md transition-all duration-300">
      <span className="flex justify-end w-full text-sm text-gray-700 px-4">
        más categorías 👉
      </span>
      <FilterButtons />
    </div>
  );
}
