import Link from 'next/link';
import { HeaderLogo } from '@/components/HeaderLogo';
import { supabaseServer } from '@/lib/supabase/server';

export default async function Landing() {
  const { data: stores } = await supabaseServer.from('stores').select('slug, name, logo_url');

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16 text-center font-barlow">
      <h1 className="text-3xl font-semibold">Catálogos online con pedidos por WhatsApp</h1>
      <p className="mt-3 max-w-md text-neutral-600">
        Plataforma para que tu comercio venda por catálogo online, con pedidos
        que llegan directo a tu WhatsApp.
      </p>

      {stores && stores.length > 0 && (
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {stores.map((store) => (
            <Link
              key={store.slug}
              href={`/${store.slug}`}
              className="flex w-32 flex-col items-center gap-2 rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-400"
            >
              <HeaderLogo logoUrl={store.logo_url} storeName={store.name} />
              <span className="text-sm font-medium">{store.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
