import type { CSSProperties, ElementType, ReactNode } from 'react';
import type { ChapaTone } from '../constants/modules';

// Descascarados de esquina: posiciones fijas por variante para que el render
// de servidor y el de cliente coincidan.
const CHIP_PRESETS: CSSProperties[][] = [
  [
    { top: 7, right: 46, ['--s' as string]: '11px' },
    { bottom: 9, left: 62, ['--s' as string]: '7px' },
  ],
  [
    { bottom: 7, right: 38, ['--s' as string]: '13px' },
    { top: 10, left: 74, ['--s' as string]: '6px' },
  ],
  [
    { top: 6, left: 40, ['--s' as string]: '9px' },
    { bottom: 12, right: 70, ['--s' as string]: '8px' },
  ],
];

interface ChapaProps {
  tone?: ChapaTone;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  chips?: 0 | 1 | 2;
  ariaHidden?: boolean;
  children: ReactNode;
}

export function Chapa({
  tone = 'bone',
  as: Tag = 'div',
  className = '',
  style,
  chips = 0,
  ariaHidden,
  children,
}: ChapaProps) {
  const preset = CHIP_PRESETS[chips % CHIP_PRESETS.length];
  return (
    <Tag className={`ck-chapa ck-${tone} ${className}`.trim()} style={style} aria-hidden={ariaHidden}>
      {preset.map((pos, i) => (
        <span key={i} className="ck-chip" style={pos} aria-hidden="true" />
      ))}
      {children}
    </Tag>
  );
}
