import { forwardRef } from 'react';
import Link from 'next/link';

interface SubcategoryBadgeProps {
  href: string;
  label: string;
  categoryName: string;
  active?: boolean;
}

export const SubcategoryBadge = forwardRef<HTMLAnchorElement, SubcategoryBadgeProps>(
  function SubcategoryBadge({ href, label, categoryName, active = false }, ref) {
    return (
      <Link
        ref={ref}
        href={href}
        data-category={categoryName}
        data-subcategory={label}
        className={`shrink-0 px-2.5 py-0.5 border rounded-full text-xs transition-colors whitespace-nowrap ${
          active
            ? 'bg-gray-700 border-gray-700 text-gray-100'
            : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
        }`}
      >
        {label}
      </Link>
    );
  },
);
