import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[0];

  // '/' (placeholder de raíz), '/api/*' (top-level, ej. api/health — no vive
  // bajo ninguna Store) y las rutas especiales de metadata a nivel de sitio
  // no tienen slug de Store: no necesitan el header ni el auth-gating de
  // abajo, que asume rutas bajo /[store]/...
  const SITE_LEVEL_ROUTES = new Set(['api', 'robots.txt', 'sitemap.xml']);
  if (!slug || SITE_LEVEL_ROUTES.has(slug)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verificar usuario autenticado (más seguro que getSession)
  const { data: { user } } = await supabase.auth.getUser();

  // Path relativo a la Store (sin el slug) para reusar la misma lógica de
  // rutas públicas/protegidas que había antes de mover todo bajo /[store].
  // La validación de que `slug` sea una Store real la hace
  // src/app/[store]/layout.tsx (notFound() si no existe).
  const restPath = '/' + segments.slice(1).join('/');

  // Rutas públicas que no requieren auth
  const publicRoutes = ['/', '/login', '/register', '/auth/callback'];
  const isPublicRoute = publicRoutes.some(route => restPath === route || restPath.startsWith(route));

  // Rutas protegidas que requieren auth
  const protectedRoutes = ['/admin', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => restPath.startsWith(route));

  // Redirigir a login si intenta acceder a ruta protegida sin sesión
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL(`/${slug}/login`, request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirigir a home si intenta acceder a login/register estando autenticado
  if ((restPath === '/login' || restPath === '/register') && user) {
    return NextResponse.redirect(new URL(`/${slug}`, request.url));
  }

  response.headers.set('x-store-slug', slug);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)',
  ],
};
