'use client';

import { useState, useMemo } from 'react';
import { useInventoryRotation } from '../../hooks/useInventoryRotation';
import { InventoryRotationTable } from './InventoryRotationTable';
import type { RotationItem } from '@/app/api/dashboard/rotation/route';

// ── Ventanas temporales ────────────────────────────────────────────────────────

const WINDOWS = [
  { days: 7,  label: '7 días',  sublabel: 'Operativo'   },
  { days: 30, label: '30 días', sublabel: 'Estratégico' },
];

// ── Segmentos ──────────────────────────────────────────────────────────────────

type SegmentKey = 'stock_roto' | 'saludable' | 'baja_rotacion' | 'sin_ventas';

const SEGMENTS: Record<SegmentKey, {
  label: string;
  sublabel: string;
  predicate: (r: number) => boolean;
  color: string;        // fondo tarjeta
  border: string;       // borde tarjeta
  badge: string;        // badge en nivel 2
  dot: string;          // punto en breadcrumb
}> = {
  stock_roto: {
    label: 'Stock roto',
    sublabel: 'rotación > 2×',
    predicate: (r) => r > 2,
    color: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-400',
  },
  saludable: {
    label: 'Saludable',
    sublabel: '0.3× — 2×',
    predicate: (r) => r >= 0.3 && r <= 2,
    color: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-400',
  },
  baja_rotacion: {
    label: 'Baja rotación',
    sublabel: '0× — 0.3×',
    predicate: (r) => r > 0 && r < 0.3,
    color: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    dot: 'bg-yellow-400',
  },
  sin_ventas: {
    label: 'Sin ventas',
    sublabel: 'rotación = 0×',
    predicate: (r) => r === 0,
    color: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  },
};

const SEGMENT_ORDER: SegmentKey[] = ['stock_roto', 'saludable', 'baja_rotacion', 'sin_ventas'];

// ── Vista (navegación 3 niveles) ───────────────────────────────────────────────

type View =
  | { level: 1 }
  | { level: 2; segment: SegmentKey }
  | { level: 3; segment: SegmentKey; category: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

function groupByCategory(items: RotationItem[]): Map<string, RotationItem[]> {
  const map = new Map<string, RotationItem[]>();
  for (const item of items) {
    const key = item.category_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function WindowSelector({
  days,
  onChange,
}: {
  days: number;
  onChange: (d: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {WINDOWS.map((w) => (
        <button
          key={w.days}
          onClick={() => onChange(w.days)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors leading-tight ${
            days === w.days
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="block">{w.label}</span>
          <span className={`block text-[10px] ${days === w.days ? 'text-gray-300' : 'text-gray-400'}`}>
            {w.sublabel}
          </span>
        </button>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

// ── Nivel 1: Tarjetas de segmento ──────────────────────────────────────────────

function SegmentCards({
  data,
  onSelect,
}: {
  data: RotationItem[];
  onSelect: (seg: SegmentKey) => void;
}) {
  const total = data.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {SEGMENT_ORDER.map((key) => {
        const seg = SEGMENTS[key];
        const items = data.filter((d) => seg.predicate(d.rotation));
        const pct = total > 0 ? Math.round((items.length / total) * 100) : 0;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`text-left p-4 rounded-xl border ${seg.color} ${seg.border} hover:shadow-md transition-shadow cursor-pointer`}
          >
            <p className="text-xs font-semibold text-gray-700 leading-tight">{seg.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{seg.sublabel}</p>
            <p className="text-2xl font-bold text-gray-800 mt-3">{items.length}</p>
            <p className="text-xs text-gray-500">
              productos <span className="font-medium">({pct}%)</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ── Nivel 2: Categorías dentro del segmento ────────────────────────────────────

function CategoryList({
  segmentKey,
  items,
  onSelect,
}: {
  segmentKey: SegmentKey;
  items: RotationItem[];
  onSelect: (category: string) => void;
}) {
  const seg = SEGMENTS[segmentKey];
  const byCategory = groupByCategory(items);
  const sorted = [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-10">
        No hay productos en este segmento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map(([category, catItems]) => (
        <button
          key={category}
          onClick={() => onSelect(category)}
          className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${seg.dot}`} />
              <span className="font-medium text-gray-800 text-sm">{category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${seg.badge}`}>
                {catItems.length} productos
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {catItems.slice(0, 4).map((p) => (
              <span key={p.id} className="text-xs text-gray-500">
                {p.name} <span className="text-gray-400">{p.rotation.toFixed(2)}×</span>
              </span>
            ))}
            {catItems.length > 4 && (
              <span className="text-xs text-gray-400">+{catItems.length - 4} más</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────────

function Breadcrumb({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (v: View) => void;
}) {
  if (view.level === 1) return null;

  const seg = SEGMENTS[view.segment];

  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4 flex-wrap">
      <button
        onClick={() => onNavigate({ level: 1 })}
        className="hover:text-gray-800 transition-colors"
      >
        Rotación de Inventario
      </button>
      <span className="text-gray-300">›</span>
      {view.level === 2 && (
        <span className="font-medium text-gray-800">{seg.label}</span>
      )}
      {view.level === 3 && (
        <>
          <button
            onClick={() => onNavigate({ level: 2, segment: view.segment })}
            className="hover:text-gray-800 transition-colors"
          >
            {seg.label}
          </button>
          <span className="text-gray-300">›</span>
          <span className="font-medium text-gray-800">{view.category}</span>
        </>
      )}
    </nav>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function InventoryRotationDashboard() {
  const [days, setDays] = useState(7);
  const [view, setView] = useState<View>({ level: 1 });

  const { data, isLoading, isError } = useInventoryRotation(days);

  const segmentedData = useMemo(() => {
    if (!data) return null;
    const result: Record<SegmentKey, RotationItem[]> = {
      stock_roto: [],
      saludable: [],
      baja_rotacion: [],
      sin_ventas: [],
    };
    for (const item of data) {
      for (const key of SEGMENT_ORDER) {
        if (SEGMENTS[key].predicate(item.rotation)) {
          result[key].push(item);
          break;
        }
      }
    }
    return result;
  }, [data]);

  const handleWindowChange = (d: number) => {
    setDays(d);
    setView({ level: 1 });
  };

  const navigate = (v: View) => setView(v);

  // Datos filtrados para nivel 3
  const level3Data = useMemo(() => {
    if (view.level !== 3 || !segmentedData) return [];
    return segmentedData[view.segment].filter((i) => i.category_name === view.category);
  }, [view, segmentedData]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Rotación de Inventario
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">ventas / stock promedio del período</p>
        </div>
        <WindowSelector days={days} onChange={handleWindowChange} />
      </div>

      <div className="p-5">
        {/* Breadcrumb */}
        <Breadcrumb view={view} onNavigate={navigate} />

        {/* Error */}
        {isError && (
          <div className="text-sm text-red-500 bg-red-50 p-4 rounded-lg border border-red-200">
            Error al cargar los datos de rotación.
          </div>
        )}

        {/* Nivel 1 */}
        {view.level === 1 && (
          <>
            {isLoading && <CardSkeleton />}
            {!isLoading && data && (
              <SegmentCards
                data={data}
                onSelect={(seg) => navigate({ level: 2, segment: seg })}
              />
            )}
          </>
        )}

        {/* Nivel 2 */}
        {view.level === 2 && segmentedData && (
          <CategoryList
            segmentKey={view.segment}
            items={segmentedData[view.segment]}
            onSelect={(cat) => navigate({ level: 3, segment: view.segment, category: cat })}
          />
        )}

        {/* Nivel 3 */}
        {view.level === 3 && (
          <InventoryRotationTable externalData={level3Data} externalDays={days} />
        )}
      </div>
    </div>
  );
}
