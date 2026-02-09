'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/admin/products',
    label: 'Productos',
  },
  {
    href: '/admin/stock',
    label: 'Control de Stock',
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 border-b border-gray-200">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
