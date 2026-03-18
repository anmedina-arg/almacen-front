'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useTopProducts } from '../../hooks/useTopProducts';
import { useTopCategories } from '../../hooks/useTopCategories';
import { useCategories } from '../../hooks/useCategories';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatPrice';
import type {
  RankingLevel,
  RankingMetric,
  RankingPeriod,
  TopCategoriesParams,
  TopProductsParams,
} from '../../types/ranking.types';

const TOP_LIMITS = [10, 15, 20, 25] as const;

function getDateRange(period: RankingPeriod, customStart: string, customEnd: string) {
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (period === 'week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: null };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString(), endDate: null };
  }

  return {
    startDate: customStart ? new Date(`${customStart}T00:00:00`).toISOString() : null,
    endDate: customEnd ? new Date(`${customEnd}T23:59:59.999`).toISOString() : null,
  };
}

function formatUnits(unitsSold: number, saleType: string): string {
  if (saleType === 'unit') return String(Math.round(unitsSold));
  if (saleType === 'kg') {
    if (unitsSold >= 1000) return `${parseFloat((unitsSold / 1000).toFixed(2))} kg`;
    return `${Math.round(unitsSold)} gr`;
  }
  return `${Math.round(unitsSold)} gr`;
}

function RankBadge({ idx }: { idx: number }) {
  if (idx === 0) return <span className="text-lg">🥇</span>;
  if (idx === 1) return <span className="text-lg">🥈</span>;
  if (idx === 2) return <span className="text-lg">🥉</span>;
  return <span className="font-mono font-semibold text-gray-500">{idx + 1}</span>;
}

export function TopProductsTable() {
  const [level, setLevel] = useState<RankingLevel>('product');
  const [period, setPeriod] = useState<RankingPeriod>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [limit, setLimit] = useState<number>(10);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [metric, setMetric] = useState<RankingMetric>('units');

  const { data: categories = [] } = useCategories();

  const { startDate, endDate } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const productParams: TopProductsParams = { startDate, endDate, limit, categoryId, metric };
  const categoryParams: TopCategoriesParams = { startDate, endDate, limit };

  const { data: products, isLoading: loadingProducts, error: errorProducts } = useTopProducts(productParams);
  const { data: categoryRows, isLoading: loadingCategories, error: errorCategories } = useTopCategories(categoryParams);

  const isLoading = level === 'product' ? loadingProducts : loadingCategories;
  const error = level === 'product' ? errorProducts : errorCategories;

  const PERIOD_LABELS: Record<RankingPeriod, string> = {
    today: 'Hoy', week: 'Esta semana', month: 'Este mes', custom: 'Rango',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Ranking</h2>
        <p className="text-sm text-gray-500">Análisis de ventas por producto y categoría</p>
      </div>

      {/* Level toggle */}
      <div className="flex rounded-md border border-gray-300 overflow-hidden w-fit">
        {(['product', 'category'] as RankingLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              level === l ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {l === 'product' ? 'Por producto' : 'Por categoría'}
          </button>
        ))}
      </div>

      {/* Metric toggle — solo visible en nivel producto */}
      {level === 'product' && (
        <div className="flex rounded-md border border-gray-300 overflow-hidden w-fit">
          {(['units', 'revenue'] as RankingMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                metric === m ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'units' ? 'Por unidades' : 'Por facturación'}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Period */}
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {(['today', 'week', 'month', 'custom'] as RankingPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                period === p ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Category filter — solo en nivel producto */}
        {level === 'product' && (
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}

        {/* Top N */}
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          {TOP_LIMITS.map((n) => (
            <option key={n} value={n}>Top {n}</option>
          ))}
        </select>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-red-800">Error al cargar el ranking: {(error as Error).message}</p>
        </div>
      )}

      {/* ── Tabla por PRODUCTO ── */}
      {!isLoading && !error && level === 'product' && products && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay ventas en el período seleccionado.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-center py-3 px-4 font-semibold text-gray-600 w-10">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Producto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoría</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        {metric === 'units' ? 'Unidades vendidas' : 'Facturación'}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => (
                      <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-center"><RankBadge idx={idx} /></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {product.product_image ? (
                              <Image src={product.product_image} alt={product.product_name} width={36} height={36} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-gray-400 text-xs">N/A</span>
                              </div>
                            )}
                            <span className="font-medium text-gray-800">{product.product_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{product.category_name ?? '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                          {metric === 'units'
                            ? formatUnits(product.units_sold, product.sale_type)
                            : formatPrice(product.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-semibold text-gray-800">{formatPrice(product.margin)}</span>
                            {product.margin_pct !== null ? (
                              <span className={`text-xs font-medium ${product.margin_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {product.margin_pct > 0 ? '+' : ''}{product.margin_pct}%
                              </span>
                            ) : (
                              <span className="text-xs text-amber-500">sin costo</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2">
                {products.map((product, idx) => (
                  <div key={product.product_id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                    <div className="w-8 text-center flex-shrink-0"><RankBadge idx={idx} /></div>
                    {product.product_image ? (
                      <Image src={product.product_image} alt={product.product_name} width={40} height={40} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">N/A</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{product.product_name}</p>
                      {product.category_name && <p className="text-xs text-gray-400">{product.category_name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono font-bold text-gray-800 text-sm">
                        {metric === 'units' ? formatUnits(product.units_sold, product.sale_type) : formatPrice(product.revenue)}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="font-mono text-xs text-gray-600">{formatPrice(product.margin)}</span>
                        {product.margin_pct !== null ? (
                          <span className={`text-xs font-medium ${product.margin_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.margin_pct > 0 ? '+' : ''}{product.margin_pct}%
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">sin costo</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tabla por CATEGORÍA ── */}
      {!isLoading && !error && level === 'category' && categoryRows && (
        <>
          {categoryRows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay ventas en el período seleccionado.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-center py-3 px-4 font-semibold text-gray-600 w-10">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoría</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">Facturación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((cat, idx) => (
                      <tr key={cat.category_id ?? cat.category_name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-center"><RankBadge idx={idx} /></td>
                        <td className="py-3 px-4 font-medium text-gray-800">{cat.category_name}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                          {formatPrice(cat.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2">
                {categoryRows.map((cat, idx) => (
                  <div key={cat.category_id ?? cat.category_name} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                    <div className="w-8 text-center flex-shrink-0"><RankBadge idx={idx} /></div>
                    <div className="flex-1 font-medium text-gray-800 text-sm">{cat.category_name}</div>
                    <div className="font-mono font-bold text-gray-800 text-sm flex-shrink-0">
                      {formatPrice(cat.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
