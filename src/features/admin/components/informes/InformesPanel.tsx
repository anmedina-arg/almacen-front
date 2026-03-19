'use client';

import { useState } from 'react';

async function downloadCsv(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json() as { error: string };
    throw new Error(body.error || 'Error al generar el informe');
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = res.headers.get('Content-Disposition')
    ?.match(/filename="(.+)"/)?.[1] ?? fallbackName;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export function InformesPanel() {
  const today = new Date().toISOString().slice(0, 10);

  // Ventas state
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState(today);
  const [ventasLoading, setVentasLoading] = useState(false);
  const [ventasError, setVentasError]     = useState('');

  // Productos state
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError]     = useState('');

  // Recomendaciones state
  const [recoLoading, setRecoLoading] = useState(false);
  const [recoStatus, setRecoStatus]   = useState<'idle' | 'ok' | 'error'>('idle');
  const [recoError, setRecoError]     = useState('');

  const handleDownloadVentas = async () => {
    setVentasError('');
    setVentasLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', `${startDate}T00:00:00`);
      if (endDate)   params.set('end_date',   `${endDate}T23:59:59`);
      await downloadCsv(`/api/reports/ventas?${params.toString()}`, 'ventas.csv');
    } catch (e) {
      setVentasError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setVentasLoading(false);
    }
  };

  const handleRefreshRecommendations = async () => {
    setRecoError('');
    setRecoStatus('idle');
    setRecoLoading(true);
    try {
      const res = await fetch('/api/admin/recommendations/refresh', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json() as { error: string };
        throw new Error(body.error || 'Error al actualizar');
      }
      setRecoStatus('ok');
    } catch (e) {
      setRecoError(e instanceof Error ? e.message : 'Error de conexión');
      setRecoStatus('error');
    } finally {
      setRecoLoading(false);
    }
  };

  const handleDownloadProductos = async () => {
    setProdError('');
    setProdLoading(true);
    try {
      await downloadCsv('/api/reports/productos', 'productos.csv');
    } catch (e) {
      setProdError(e instanceof Error ? e.message : 'Error de conexión');
    } finally {
      setProdLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-xl flex flex-col gap-6">
      <h1 className="text-xl font-bold">Informes</h1>

      {/* ── Ventas ── */}
      <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Detalle de ventas</h2>
        <p className="text-xs text-gray-500">
          Órdenes e ítems con cliente, método de pago, saldo pendiente,
          categoría, cantidad, subtotal, costo y margen.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Dejá &quot;Desde&quot; vacío para incluir todas las órdenes desde el inicio.
        </p>

        {ventasError && <span className="text-xs text-red-600">{ventasError}</span>}

        <button
          onClick={handleDownloadVentas}
          disabled={ventasLoading}
          className="self-start flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {ventasLoading ? '⏳ Generando...' : '⬇ Descargar CSV'}
        </button>
      </div>

      {/* ── Productos ── */}
      <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Catálogo de productos</h2>
        <p className="text-xs text-gray-500">
          Todos los productos con precio de venta, costo, márgenes,
          categoría, subcategoría y stock actual.
        </p>

        {prodError && <span className="text-xs text-red-600">{prodError}</span>}

        <button
          onClick={handleDownloadProductos}
          disabled={prodLoading}
          className="self-start flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {prodLoading ? '⏳ Generando...' : '⬇ Descargar CSV'}
        </button>
      </div>

      {/* ── Recomendaciones ── */}
      <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Recomendaciones de productos</h2>
        <p className="text-xs text-gray-500">
          Recalcula la matriz de afinidad entre productos en base a las órdenes de los últimos 30 días.
          Ejecutar cada vez que haya acumulado suficientes ventas nuevas.
        </p>

        {recoError && <span className="text-xs text-red-600">{recoError}</span>}
        {recoStatus === 'ok' && (
          <span className="text-xs text-green-600 font-medium">✓ Afinidad actualizada correctamente</span>
        )}

        <button
          onClick={handleRefreshRecommendations}
          disabled={recoLoading}
          className="self-start flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {recoLoading ? '⏳ Calculando...' : '↺ Actualizar afinidad'}
        </button>
      </div>
    </div>
  );
}
