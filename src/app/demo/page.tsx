import type { Metadata } from 'next';
import Link from 'next/link';
import { Chapa } from '@/features/landing/components/Chapa';
import { DemoPhone } from '@/features/landing/components/DemoPhone';
import { LandingShell } from '@/features/landing/components/LandingShell';
import { getDemoStore } from '@/features/store/services/getDemoStore';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Demo de chaskyapp: pedí como lo haría un vecino',
  description:
    'Armá un pedido en la Demo Store y mandalo por WhatsApp. Productos reales, precios de ejemplo.',
};

// La Demo Store se da de alta en producción después de desplegar este
// código (ver docs/ops/demo-store.md): resolverla en cada request evita que
// la página quede congelada en "todavía no hay demo" hasta el próximo deploy.
export const dynamic = 'force-dynamic';

const STEPS = [
  {
    title: 'Elegí productos',
    text: 'Sumá gaseosas, snacks o hamburguesas con el botón + de cada card, como haría un vecino desde su celular.',
  },
  {
    title: 'Tocá Enviar pedido',
    text: 'Vas a ver el mensaje armado con cantidades y total antes de confirmarlo.',
  },
  {
    title: 'El mensaje se abre en tu WhatsApp',
    text: 'Sale desde tu propio WhatsApp hacia el número de la demo, igual que le llegaría al almacén.',
  },
];

/**
 * Ruta de nivel de sitio (#153, ADR-0015): la demo en un marco de celular.
 * En pantallas angostas DemoPhone redirige al catálogo a pantalla completa.
 */
export default async function DemoPage() {
  let demoStore = null;
  try {
    demoStore = await getDemoStore(supabaseServer);
  } catch (error) {
    console.error('[demo] no se pudo resolver la Demo Store:', error);
  }
  const catalogPath = demoStore ? `/${demoStore.slug}` : null;

  return (
    <LandingShell>
      <section className="ck-wrap ck-section ck-demo" aria-labelledby="demo-title" style={{ paddingTop: 12 }}>
        <Chapa tone="bone" chips={1} className="ck-demo-guide">
          <h1 id="demo-title" className="ck-h2 ck-display">
            Probalo como lo haría un vecino.
          </h1>
          <p className="ck-demo-lede">
            La Demo Store es un almacén de muestra: productos reales, precios de ejemplo. Lo que
            ves en el celular es el catálogo tal cual lo usan los clientes de un Store.
          </p>
          <ol className="ck-demo-steps">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="ck-demo-step-n ck-display">{i + 1}</span>
                <div>
                  <p className="ck-demo-step-title ck-display">{step.title}</p>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="ck-demo-actions">
            {catalogPath && (
              <Link href={catalogPath} className="ck-link">
                Abrir la demo a pantalla completa
              </Link>
            )}
            <Link href="/stores" className="ck-link">
              Ver quiénes ya lo usan
            </Link>
          </div>
        </Chapa>
        {catalogPath ? (
          <DemoPhone catalogPath={catalogPath} />
        ) : (
          <Chapa tone="navy" chips={0}>
            <p className="ck-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
              La demo todavía no está disponible.
            </p>
            <p style={{ marginTop: 12, maxWidth: '34ch' }}>
              Escribinos por WhatsApp y te la mostramos funcionando.
            </p>
          </Chapa>
        )}
      </section>
    </LandingShell>
  );
}
