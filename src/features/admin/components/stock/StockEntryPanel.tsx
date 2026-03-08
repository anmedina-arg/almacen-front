'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { WeightType } from '@/features/catalog/types';
import { getQuantityPerClick } from '@/features/catalog/utils/productUtils';
import { useProductStock } from '../../hooks/useProductStock';
import { useProducts } from '@/hooks/useProducts';
import { useStockEntry } from '../../hooks/useStockEntry';
import { useBatchIncrementStock } from '../../hooks/useBatchIncrementStock';
import { StockEntryCard } from './StockEntryCard';
import type { StockEntryCardProduct } from './StockEntryCard';
import { normalize } from '@/utils/normalize';

export function StockEntryPanel() {
  const { data: stockData = [], isLoading: stockLoading } = useProductStock();
  const { data: productsData = [], isLoading: productsLoading } = useProducts({ includeInactive: true });
  const { entries, addEntry, removeEntry, setNotes, clearAll, getEntryAmount, getEntryNotes } =
    useStockEntry();
  const batchMutation = useBatchIncrementStock();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Map productId → sale_type from full product list
  const saleTypeMap = useMemo(() => {
    return new Map(productsData.map((p) => [p.id, p.sale_type as WeightType]));
  }, [productsData]);

  // Merge stock view + sale_type, filter only active products
  const mergedProducts = useMemo((): StockEntryCardProduct[] => {
    return stockData
      .filter((s) => s.product_active)
      .map((s) => ({
        ...s,
        sale_type: saleTypeMap.get(s.product_id) ?? ('unit' as WeightType),
      }))
      .sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [stockData, saleTypeMap]);

  // Filter by search query
  const filteredProducts = useMemo(() => {
    const q = normalize(debouncedSearch);
    if (!q) return mergedProducts;
    return mergedProducts.filter((p) => normalize(p.product_name).includes(q));
  }, [mergedProducts, debouncedSearch]);

  const pendingCount = entries.size;

  const handleConfirm = () => {
    const entriesToSubmit = Array.from(entries.entries()).map(([productId, value]) => ({
      product_id: productId,
      increment: value.increment,
      notes: value.notes,
    }));

    batchMutation.mutate(entriesToSubmit, {
      onSuccess: (results) => {
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          const names = failed.map((r) => {
            const p = mergedProducts.find((mp) => mp.product_id === r.product_id);
            return p?.product_name ?? `Producto #${r.product_id}`;
          });
          setErrorMessage(`Error al ingresar: ${names.join(', ')}`);
        } else {
          setSuccessMessage(
            `${entriesToSubmit.length} producto(s) actualizados correctamente.`
          );
        }
        clearAll();
      },
      onError: (error) => {
        setErrorMessage(error.message);
      },
    });
  };

  if (stockLoading || productsLoading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">Cargando productos...</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Link
          href="/admin/stock"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Volver
        </Link>
        <h1 className="text-lg font-bold">Ingreso de Stock</h1>
        <div className="w-16" />
      </div>

      {/* Buscador */}
      <div className="px-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          aria-label="Buscar productos"
        />
      </div>

      {/* Lista de productos */}
      <div className="flex flex-col gap-2 px-4">
        {filteredProducts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No se encontraron productos.
          </p>
        ) : (
          filteredProducts.map((product) => {
            const amountPerClick = getQuantityPerClick({
              name: product.product_name,
              sale_type: product.sale_type,
            });

            return (
              <StockEntryCard
                key={product.product_id}
                product={product}
                increment={getEntryAmount(product.product_id)}
                notes={getEntryNotes(product.product_id)}
                onAdd={(id) => addEntry(id, amountPerClick)}
                onRemove={(id) => removeEntry(id, amountPerClick)}
                onNotesChange={setNotes}
              />
            );
          })
        )}
      </div>

      {/* Panel sticky inferior — visible cuando hay entradas pendientes */}
      {pendingCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-lg z-40">
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{pendingCount}</span> producto
            {pendingCount !== 1 ? 's' : ''} a ingresar
          </span>
          <button
            onClick={handleConfirm}
            disabled={batchMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {batchMutation.isPending ? 'Guardando...' : 'Confirmar Ingreso'}
          </button>
        </div>
      )}

      {/* Toast de éxito */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start gap-2">
            <p className="text-sm">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 font-bold text-lg leading-none"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Toast de error */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-start gap-2">
            <p className="text-sm">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
