'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MANAGEMENT_LINKS = [
  { href: '/admin/products', label: 'Productos' },
  { href: '/admin/categories', label: 'Categorías' },
  { href: '/admin/stock', label: 'Stock' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/sales', label: 'Ventas' },
];

export function AdminTabBar() {
  const pathname = usePathname();
  const isPOS = pathname.startsWith('/admin/pos');

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Tabs principales */}
      <div className="flex">
        <Link
          href="/admin/pos"
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
            isPOS
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🛒 Punto de Venta
        </Link>
        <Link
          href="/admin/products"
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${
            !isPOS
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚙️ Gestión
        </Link>
      </div>

      {/* Sub-nav de Gestión (solo visible fuera del POS) */}
      {!isPOS && (
        <nav className="flex overflow-x-auto px-2 border-t border-gray-100">
          {MANAGEMENT_LINKS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
