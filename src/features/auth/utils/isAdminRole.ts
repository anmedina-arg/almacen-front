// Predicado compartido (#43): único punto de verdad para "¿puede este
// usuario administrar esta Store?" — Store admin (membership en
// store_admins) o Platform admin (profiles.role = 'super_admin', ver
// ADR-0005). Antes de #43 esta misma decisión estaba reimplementada de
// forma independiente en 3 lugares (resolveStoreAdminStatus, HeaderClient,
// AdminPanelLink) con su propia query a profiles y su propio chequeo de rol
// hardcodeado — encontrado arreglando un lockout de producción del Platform
// admin (#13): se corrigió un lugar primero, y quedaron otros rotos hasta
// un segundo pase, porque nadie sabía que existían por separado.
//
// Puro y sync a propósito: server (resolveStoreAdminStatus, en
// roleHelpers.ts) y cliente (HeaderClient) resuelven role/membership con
// clients de Supabase distintos (cookie-bound vs. browser), pero la
// decisión final —dado un rol y si hay membership— es la misma en los dos
// lados. Este es el seam que se testea en aislamiento, sin red.
//
// Vive en su propio archivo, separado de roleHelpers.ts, a propósito: ese
// archivo importa `next/headers` (server-only) para verifyStoreAdminAuth.
// HeaderClient.tsx es un Client Component — si importara isAdminRole desde
// roleHelpers.ts, el bundler arrastraría el módulo entero, next/headers
// incluido, rompiendo el build (`next build` falla: "You're importing a
// component that needs next/headers... not supported in the pages/
// directory" — encontrado en #101 corriendo un build real, no solo tsc).
export function isAdminRole(role: string | null | undefined, hasStoreMembership: boolean): boolean {
  if (role === 'super_admin') return true;
  return hasStoreMembership;
}
