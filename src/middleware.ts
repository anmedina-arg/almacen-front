import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  isPlatformAdminPath,
  isPublicPlatformAdminPath,
  PLATFORM_ADMIN_LOGIN,
} from '@/features/auth/utils/platformAdmin';

// Dominio bajo el que vivía la app entera antes de este PR (single-tenant).
// Se mantiene como alias del mismo proyecto Vercel post-rename para no matar
// los links ya compartidos ni las PWA que los clientes ya instalaron con ese
// host — su manifest quedó fijo con start_url/scope = "/" al momento de
// instalar, y eso no se puede reescribir de manera remota. Por eso el
// redirect de abajo es same-origin (mismo host, solo cambia el path): un
// redirect cross-domain hacia el dominio nuevo rompería el modo standalone
// de esas PWA.
const LEGACY_HOST = 'market-del-cevil.vercel.app';
const LEGACY_STORE_SLUG = 'market-del-cevil';

// Dominio oficial del panel del Platform admin (#194). Las cookies de sesión
// son por dominio: si /admin respondiera en los dos hosts, el Platform admin
// tendría que estar logueado en el que justo abrió. Este redirect sí es
// cross-domain, pero solo toca /admin, que ninguna PWA de cliente usa.
// Fijo a propósito y no NEXT_PUBLIC_SITE_URL: ese valor existe para el host
// legacy (ver authService.signInWithGoogle) y no tiene por qué ser chaskyapp.
const PLATFORM_ORIGIN = 'https://chaskyapp.vercel.app';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[0];

  // '/' (placeholder de raíz), '/api/*' (top-level, ej. api/health — no vive
  // bajo ninguna Store) y las rutas especiales de metadata a nivel de sitio
  // no tienen slug de Store: no necesitan el header ni el auth-gating de
  // abajo, que asume rutas bajo /[store]/...
  const SITE_LEVEL_ROUTES = new Set(['api', 'robots.txt', 'sitemap.xml', 'stores', 'admin', 'demo']);

  const isPanelPath = isPlatformAdminPath(pathname);

  if (request.headers.get('host') === LEGACY_HOST && isPanelPath) {
    const redirectUrl = new URL(pathname, PLATFORM_ORIGIN);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  // Request al host legacy sin el slug de su Store ya al frente (link viejo,
  // bookmark, o PWA instalada arrancando en start_url "/"): reinyectamos el
  // slug y dejamos que el resto de este middleware (y el resto de la app)
  // trate la request como cualquier otra bajo /[store]/...
  if (
    request.headers.get('host') === LEGACY_HOST &&
    slug !== LEGACY_STORE_SLUG &&
    !SITE_LEVEL_ROUTES.has(slug)
  ) {
    const redirectUrl = new URL(
      `/${LEGACY_STORE_SLUG}${pathname === '/' ? '' : pathname}`,
      request.url
    );
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  // /admin es de nivel de sitio pero, a diferencia del resto, necesita la
  // sesión refrescada (#194): sigue de largo hasta el bloque de Supabase.
  if (!slug || (SITE_LEVEL_ROUTES.has(slug) && !isPanelPath)) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  // Verificar usuario autenticado (más seguro que getSession). Si Supabase
  // Auth falla (caída, timeout) se trata la request como anónima en vez de
  // tirar un 500: así el catálogo público sigue disponible (#190). Es seguro
  // para las rutas protegidas: sin usuario, abajo redirigen al login.
  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch (err) {
    console.error('[middleware] auth.getUser falló:', err instanceof Error ? err.message : err);
  }

  // Path relativo a la Store (sin el slug) para reusar la misma lógica de
  // rutas públicas/protegidas que había antes de mover todo bajo /[store].
  // La validación de que `slug` sea una Store real la hace
  // src/app/[store]/layout.tsx (notFound() si no existe).
  const restPath = '/' + segments.slice(1).join('/');

  // Panel del Platform admin: sin sesión, a su propio login. El rol
  // super_admin lo comprueba cada página (404 si no lo tiene, ADR-0015).
  if (isPanelPath) {
    if (!user && !isPublicPlatformAdminPath(pathname)) {
      const redirectUrl = new URL(PLATFORM_ADMIN_LOGIN, request.url);
      redirectUrl.searchParams.set('redirectTo', pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

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
