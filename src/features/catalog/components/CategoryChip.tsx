'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CategoryChipProps {
  to: string;
  label: string;
  imageUrl?: string | null;
  active?: boolean;
  priority?: boolean;
}

export const CategoryChip = forwardRef<HTMLAnchorElement, CategoryChipProps>(
  function CategoryChip({ to, label, imageUrl, active = false, priority = false }, ref) {
    return (
      <Link
        ref={ref}
        href={to}
        className={`font-medium py-0.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 w-20 shrink-0 transition-colors ${
          active ? 'bg-gray-700' : ''
        }`}
      >
        <div
          className={`relative w-full h-12 rounded-xl overflow-hidden transition-colors ${
            active ? 'bg-gray-600' : 'bg-gray-200'
          }`}
        >
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={label}
              fill
              className="object-cover"
              sizes="80px"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
            />
          )}
        </div>
        <span className={`text-xs capitalize transition-colors ${active ? 'text-gray-100' : ''}`}>
          {label}
        </span>
      </Link>
    );
  },
);
