'use client';

import { useState } from 'react';

interface ComboDisclosureProps {
  items: string[];
}

export function ComboDisclosure({ items }: ComboDisclosureProps) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-0.5 bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded"
      >
        Qué incluye?
      </button>
    );
  }

  return (
    <>
      <ul className="text-xs text-gray-500 mt-0.5 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1">
            <span className="text-gray-300 mt-px">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="mt-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded"
      >
        Ver menos
      </button>
    </>
  );
}
