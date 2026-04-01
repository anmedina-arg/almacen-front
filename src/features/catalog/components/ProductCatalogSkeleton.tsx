function ProductCardSkeleton() {
  return (
    <div className="flex w-full items-center justify-between border border-gray-200 rounded-lg shadow-sm animate-pulse">
      <div className="flex flex-row items-center gap-3">
        <div className="w-20 h-20 bg-gray-200 rounded-tl-lg rounded-bl-lg flex-shrink-0" />
        <div className="flex flex-col gap-2 py-2">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 pr-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="mb-6">
      <div className="h-5 w-28 bg-gray-300 rounded mb-3 animate-pulse" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ProductCatalogSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <CategorySkeleton key={i} />
      ))}
    </div>
  );
}
