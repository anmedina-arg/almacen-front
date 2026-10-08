import Link from 'next/link';
import { Archivo } from 'next/font/google';
import type { ReactNode } from 'react';
import { WhatsAppButton } from './WhatsAppButton';
import '../landing.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
});

function Wordmark() {
  return (
    <Link href="/" className="ck-wordmark ck-display" aria-label="chaskyapp, inicio">
      <span>chasky</span>
      <span>app</span>
    </Link>
  );
}

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className={`ck-root ${archivo.variable}`}>
      <header className="ck-wrap ck-nav">
        <Wordmark />
        <nav className="ck-nav-links" aria-label="Principal">
          <Link href="/stores" className="ck-link">
            Stores
          </Link>
          <WhatsAppButton tone="mustard">WhatsApp</WhatsAppButton>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="ck-wrap ck-footer">
        <Wordmark />
      </footer>
    </div>
  );
}
