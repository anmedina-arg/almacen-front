import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { AdminNav } from '@/features/admin/components/AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Layout can't modify cookies
          }
        },
      },
    }
  );

  // Verificar usuario (más seguro que getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/admin/products');
  }

  // Verificar rol admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del admin */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Panel de Administración</h1>
            <p className="text-sm text-gray-600">Gestión de productos - Market del Cevil</p>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Volver al sitio
          </Link>
        </div>
      </div>

      {/* Navegación */}
      <div className="container mx-auto px-4 pt-6">
        <AdminNav />
      </div>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
