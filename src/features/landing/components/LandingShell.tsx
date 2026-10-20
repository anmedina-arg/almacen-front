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
          <Link href="/demo" className="ck-link">
            Demo
          </Link>
          <Link href="/stores" className="ck-link">
            Stores
          </Link>
          {/* En celulares angostos el texto se oculta visualmente (queda el ícono)
              para que entren Demo, Stores y el botón — sigue siendo el nombre accesible. */}
          <WhatsAppButton tone="mustard">
            <span className="ck-nav-btn-label">WhatsApp</span>
          </WhatsAppButton>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="ck-wrap ck-footer">
        <Wordmark />
        {/* Acceso discreto al panel de plataforma (#151): para quien no es super_admin da 404. */}
        <Link href="/admin" className="ck-footer-admin" prefetch={false} aria-label="Panel de plataforma">
          Panel
        </Link>
      </footer>
    </div>
  );
}
