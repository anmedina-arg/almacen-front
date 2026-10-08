import Link from 'next/link';
import { Chapa } from './Chapa';
import { WhatsAppButton } from './WhatsAppButton';

export function ProofSection() {
  return (
    <section className="ck-wrap ck-section" aria-labelledby="prueba-title" style={{ paddingTop: 0 }}>
      <div className="ck-proof">
        <Chapa tone="mustard" chips={2}>
          <h2 id="prueba-title" className="ck-h2 ck-display">
            Ya funciona en un almacén de verdad.
          </h2>
          <p style={{ marginTop: 18, maxWidth: '46ch', fontSize: '1.15rem' }}>
            Market Cevil es el primer almacén que usa chaskyapp: catálogo público, pedidos
            por WhatsApp y panel de gestión. Entrá y pedí como lo haría un vecino.
          </p>
          <div className="ck-proof-actions">
            <Link href="/market-del-cevil" className="ck-btn ck-btn-bone">
              Ver el catálogo de Market Cevil
            </Link>
            <Link href="/stores" className="ck-link">
              Ver todos los Stores
            </Link>
          </div>
        </Chapa>
        <Chapa tone="navy" chips={0}>
          <p className="ck-display" style={{ fontSize: 'clamp(2rem, 3.8vw, 3.2rem)' }}>
            Cada negocio tiene su propia dirección.
          </p>
          <p style={{ marginTop: 16, maxWidth: '34ch' }}>
            Tu local vive en <b>chaskyapp.vercel.app/tu-local</b>, con tu nombre, tu logo y
            tu catálogo.
          </p>
        </Chapa>
      </div>
    </section>
  );
}

export function CloseSection() {
  return (
    <section className="ck-wrap ck-section" aria-labelledby="cierre-title" style={{ paddingTop: 0 }}>
      <Chapa tone="red" chips={1}>
        <div className="ck-close">
          <h2 id="cierre-title" className="ck-h2 ck-display">
            Contanos cómo trabaja tu local.
          </h2>
          <p style={{ maxWidth: '52ch', fontSize: '1.15rem' }}>
            Escribinos por WhatsApp, te mostramos el sistema funcionando y vemos qué módulos
            tienen sentido para vos.
          </p>
          <div>
            <WhatsAppButton tone="mustard" />
          </div>
        </div>
      </Chapa>
    </section>
  );
}
