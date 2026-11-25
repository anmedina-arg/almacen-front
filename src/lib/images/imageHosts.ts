/**
 * Hosts desde los que `next/image` puede mostrar imágenes remotas. Una sola
 * lista: `next.config.ts` arma con ella sus `remotePatterns`, y la Importación
 * masiva la usa para rechazar una `imagen_url` que rompería el listado del
 * admin y el catálogo (con un host no autorizado `next/image` lanza error al
 * renderizar).
 */
export interface ImageHostRule {
  /** Nombre exacto del host, o `*.dominio` para cualquier subdominio. */
  hostname: string;
  /** Prefijo de ruta permitido; `/` permite todo el host. */
  pathPrefix: string;
}

type Env = Record<string, string | undefined>;

const SUPABASE_STORAGE_PATH = '/storage/v1/object/public/';

export function getImageHostRules(env: Env = process.env): ImageHostRule[] {
  const rules: ImageHostRule[] = [];
  // Hostname exacto de la URL de Supabase para que Next pueda optimizar
  // imágenes de Storage: el wildcard *.supabase.co no matchea bien en todos
  // los entornos, y queda solo como respaldo si la variable no está.
  const supabaseHostname = env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : '*.supabase.co';
  rules.push({ hostname: supabaseHostname, pathPrefix: SUPABASE_STORAGE_PATH });

  // Las imágenes no se duplican entre entornos: en TEST los productos siguen
  // apuntando al bucket de producción (ver .env.test.example).
  const imageStorageHostname = env.NEXT_PUBLIC_IMAGE_STORAGE_URL
    ? new URL(env.NEXT_PUBLIC_IMAGE_STORAGE_URL).hostname
    : undefined;
  if (imageStorageHostname && imageStorageHostname !== supabaseHostname) {
    rules.push({ hostname: imageStorageHostname, pathPrefix: SUPABASE_STORAGE_PATH });
  }

  rules.push({ hostname: 'res.cloudinary.com', pathPrefix: '/' });
  rules.push({ hostname: 'lh3.googleusercontent.com', pathPrefix: '/' });
  return rules;
}

const hostMatches = (rule: string, hostname: string): boolean =>
  rule.startsWith('*.') ? hostname.endsWith(rule.slice(1)) : hostname === rule;

/** `true` si `next/image` puede mostrar esa URL: https, host de la lista y ruta permitida. */
export function isAllowedImageUrl(url: string, rules: ImageHostRule[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return rules.some((rule) => hostMatches(rule.hostname, parsed.hostname) && parsed.pathname.startsWith(rule.pathPrefix));
}
