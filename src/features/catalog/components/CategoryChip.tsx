import { forwardRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CategoryChipProps {
  to: string;
  label: string;
  imageUrl?: string | null;
  active?: boolean;
}

export const CategoryChip = forwardRef<HTMLAnchorElement, CategoryChipProps>(
  function CategoryChip({ to, label, imageUrl, active = false }, ref) {
    return (
      <Link
        ref={ref}
        href={to}
        className={`font-medium py-0.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 w-24 shrink-0 transition-colors ${
          active ? 'bg-gray-700' : ''
        }`}
      >
        <div
          className={`relative w-full h-16 rounded-xl overflow-hidden transition-colors ${
            active ? 'bg-gray-600' : 'bg-gray-200'
          }`}
        >
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={label}
              fill
              className="object-cover"
              sizes="96px"
            />
          )}
        </div>
        <span className={`text-sm capitalize transition-colors ${active ? 'text-gray-100' : ''}`}>
          {label}
        </span>
      </Link>
    );
  },
);
