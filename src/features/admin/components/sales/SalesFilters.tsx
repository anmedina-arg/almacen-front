'use client';

import type { QuickFilter } from '../../hooks/useSalesFilters';

interface SalesFiltersProps {
  quickFilter: QuickFilter;
  dateFrom: string;
  dateTo: string;
  onQuickFilter: (preset: QuickFilter) => void;
  onDateFrom: (value: string) => void;
  onDateTo: (value: string) => void;
}

const QUICK_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Últimos 7 días' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todos' },
];

export function SalesFilters({
  quickFilter,
  dateFrom,
  dateTo,
  onQuickFilter,
  onDateFrom,
  onDateTo,
}: SalesFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Quick filters */}
      <div className="flex gap-1 flex-wrap">
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onQuickFilter(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              quickFilter === opt.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFrom(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Fecha desde"
        />
        <span className="text-gray-400 text-xs">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateTo(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Fecha hasta"
        />
      </div>
    </div>
  );
}
