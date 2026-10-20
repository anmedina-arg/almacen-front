import type { Metadata } from 'next';
import Link from 'next/link';
import { HeaderLogo } from '@/components/HeaderLogo';
import { Chapa } from '@/features/landing/components/Chapa';
import { LandingShell } from '@/features/landing/components/LandingShell';
import { supabaseServer } from '@/lib/supabase/server';
import { listPublicStores, type PublicStore } from '@/features/store/services/listPublicStores';

export const metadata: Metadata = {
  title: 'Stores en chaskyapp',
  description: 'Los negocios que ya usan chaskyapp para vender por catálogo y WhatsApp.',
};

export default async function StoresPage() {
  // Solo negocios reales: la Demo Store queda afuera (#153). Si la consulta
  // falla, la página muestra el estado vacío en vez de romperse.
  let stores: PublicStore[] = [];
  try {
    stores = await listPublicStores(supabaseServer);
  } catch (error) {
    console.error('[stores] no se pudo listar las Stores:', error);
  }

  return (
    <LandingShell>
      <section className="ck-wrap ck-section" style={{ paddingTop: 12 }}>
        <div className="ck-section-intro">
          <h1 className="ck-h2 ck-display">Los negocios que ya usan chaskyapp.</h1>
          <p>Entrá al catálogo de cualquiera y mirá cómo se pide.</p>
        </div>
        {stores.length > 0 ? (
          <div className="ck-stores">
            {stores.map((store, i) => (
              <Link key={store.slug} href={`/${store.slug}`} className="ck-store">
                <Chapa
                  tone={i % 2 === 0 ? 'bone' : 'mustard'}
                  chips={(i % 3) as 0 | 1 | 2}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <HeaderLogo logoUrl={store.logo_url} storeName={store.name} />
                  <span className="ck-display" style={{ fontSize: '1.6rem' }}>
                    {store.name}
                  </span>
                </Chapa>
              </Link>
            ))}
          </div>
        ) : (
          <p>Todavía no hay negocios para mostrar.</p>
        )}
      </section>
    </LandingShell>
  );
}
