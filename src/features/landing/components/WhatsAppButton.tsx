import type { ReactNode } from 'react';
import { WHATSAPP_URL } from '../constants/whatsapp';

interface WhatsAppButtonProps {
  tone?: 'red' | 'mustard' | 'bone';
  children?: ReactNode;
}

export function WhatsAppButton({
  tone = 'red',
  children = 'Escribinos por WhatsApp',
}: WhatsAppButtonProps) {
  return (
    <a
      className={`ck-btn ck-btn-${tone}`}
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 20l1.3-4.2A8.5 8.5 0 1 1 8.4 18.8L4 20z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9.2 8.6c.3 2.4 2.6 4.8 5.2 5.3l1.2-1.3-1.9-1-.9.7c-.9-.4-1.7-1.2-2.1-2.1l.7-.9-1-1.9-1.2 1.2z"
          fill="currentColor"
        />
      </svg>
      {children}
    </a>
  );
}
