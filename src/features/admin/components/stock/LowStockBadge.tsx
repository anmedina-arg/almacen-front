'use client';

interface LowStockBadgeProps {
  isLowStock: boolean;
  quantity: number | null;
  minStock: number | null;
}

/**
 * Badge visual que indica si un producto tiene stock bajo.
 * Muestra diferentes estados: sin stock configurado, stock normal, stock bajo.
 */
export function LowStockBadge({ isLowStock, quantity, minStock }: LowStockBadgeProps) {
  // Sin stock configurado
  if (quantity === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Sin stock
      </span>
    );
  }

  // Stock bajo
  if (isLowStock) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Stock bajo
        {minStock !== null && (
          <span className="ml-1 text-red-500">
            (min: {Number(minStock)})
          </span>
        )}
      </span>
    );
  }

  // Stock sin minimo configurado
  if (minStock === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
        Sin minimo
      </span>
    );
  }

  // Stock normal
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      OK
    </span>
  );
}
