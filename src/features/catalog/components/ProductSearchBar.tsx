'use client';

interface ProductSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductSearchBar({ value, onChange }: ProductSearchBarProps) {
  return (
    <div className="w-full flex justify-center px-4 py-2 sticky top-52 z-30 bg-white/80 backdrop-blur-md transition-all duration-300">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar producto por nombre..."
        className="w-full max-w-lg bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
        aria-label="Buscar productos"
      />
    </div>
  );
}
