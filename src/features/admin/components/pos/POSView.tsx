'use client';

import { useState, useMemo, useCallback } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { usePOSCart } from '../../hooks/usePOSCart';
import { normalize } from '@/utils/normalize';
import { formatPrice } from '@/utils/formatPrice';
import { useProducts } from '@/hooks/useProducts';

export function POSView() {
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: products = [], isLoading } = useProducts();

  const { add, remove, getQty, entries, total, itemCount, clear } = usePOSCart();

  // ProductSquareCard espera (id: number) — adaptamos al hook que recibe Product
  const handleAdd = useCallback((id: number) => {
    const product = products.find((p) => p.id === id);
    if (product) add(product);
  }, [products, add]);

  const handleRemove = useCallback((id: number) => remove(id), [remove]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = normalize(search);
    return products.filter((p) => normalize(p.name).includes(q));
  }, [products, search]);

  async function handleCreateOrder() {
    if (entries.length === 0) return;
    setCreating(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim() || undefined,
          items: entries.map(({ product, qty }) => ({
            product_id: product.id,
            product_name: product.name,
            quantity: qty,
            unit_price: product.price,
            unit_cost: product.cost ?? 0,
            is_by_weight: product.sale_type !== 'unit',
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string; products?: { name: string }[] };
        if (data.error === 'insufficient_stock' && data.products) {
          const names = data.products.map((p) => p.name).join(', ');
          setErrorMsg(`Stock insuficiente: ${names}`);
        } else {
          setErrorMsg(data.error || 'Error al crear la orden');
        }
        return;
      }

      // Éxito
      clear();
      setCustomerName('');
      setSearch('');
      setSuccessMsg('¡Orden creada!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setErrorMsg('Error de conexión');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">

      {/* Barra de búsqueda fija */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-2 pt-1">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
        />
      </div>

      {/* Toast de éxito */}
      {successMsg && (
        <div className="mx-auto my-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl shadow">
          {successMsg}
        </div>
      )}

      {/* Grid de productos */}
      <div className="flex-1 overflow-y-auto pb-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-40 text-gray-400 text-sm">
            Cargando productos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-gray-400 text-sm">
            {search ? 'Sin resultados' : 'No hay productos disponibles'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={getQty(product.id)}
                onAdd={handleAdd}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer fijo: totalizador + crear orden */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4 shadow-lg space-y-3">

        {/* Nombre del cliente */}
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nombre del cliente (opcional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={creating}
        />

        {/* Error */}
        {errorMsg && (
          <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
        )}

        {/* Total + botón */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">{itemCount} {itemCount === 1 ? 'producto' : 'productos'}</p>
            <p className="text-2xl font-bold text-gray-800">{formatPrice(total)}</p>
          </div>
          <button
            onClick={handleCreateOrder}
            disabled={creating || entries.length === 0}
            className="flex-1 max-w-xs py-3 bg-green-600 text-white font-semibold rounded-xl shadow hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {creating ? 'Creando orden...' : 'Crear Orden'}
          </button>
        </div>
      </div>
    </div>
  );
}
