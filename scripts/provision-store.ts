/**
 * Alta manual de una Store nueva de punta a punta (#26, ADR-0006)
 *
 * Qué hace:
 *  1. Busca un profile existente por email; si no existe, invita al dueño
 *     vía Supabase Auth Admin API (le llega un mail de invitación) y le crea
 *     el profile.
 *  2. Crea la Store (stores) + su membership de admin (store_admins) en una
 *     sola transacción (provision_store RPC).
 *  3. Escribe las 8 keys de feature_flags de forma explícita (por defecto
 *     todas en false — un módulo se prende cuando se vende, ver ADR-0012) y
 *     el whatsapp_number inicial (null = fallback a NEXT_PUBLIC_WHATSAPP_NUMBER).
 *
 * Uso:
 *  npx tsx scripts/provision-store.ts \
 *    --slug=nueva-store --name="Nueva Store" --owner-email=cliente@example.com \
 *    --operator-email=vos@example.com \
 *    [--whatsapp=5493810000000] [--flags=stock,pos,pagos]
 *
 * Requisitos:
 *  - tsx instalado (ver package-lock.json)
 *  - Variables de entorno en .env.local:
 *      NEXT_PUBLIC_SUPABASE_URL
 *      SUPABASE_SERVICE_ROLE_KEY   ← necesita permisos de admin (auth + bypass RLS)
 *
 * "Solo accesible a super_admin" (#26 AC) tiene dos capas: SUPABASE_SERVICE_ROLE_KEY
 * solo vive en .env.local del Platform admin (nunca en el bundle del cliente
 * ni en ninguna ruta pública, mismo mecanismo que el resto de scripts/ — ver
 * migrate-images-to-supabase.ts), Y --operator-email se verifica de verdad
 * contra profiles.role = 'super_admin' antes de escribir nada (ver
 * assertOperatorIsSuperAdmin en provisionStore.ts) — reusa la maquinaria de
 * #13 en vez de confiar solo en la posesión del key.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { provisionStore } from '../src/lib/store/provisionStore';
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from '../src/lib/store/featureFlags';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('.env.local no encontrado');
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.slice(2).split('=');
    args[key] = rest.join('=');
  }
  return args;
}

function parseFlags(raw: string | undefined): Partial<Record<FeatureFlagKey, boolean>> {
  if (!raw) return {};
  const enabled = new Set(raw.split(',').map((k) => k.trim()));
  const unknown = [...enabled].filter((k) => !FEATURE_FLAG_KEYS.includes(k as FeatureFlagKey));
  if (unknown.length > 0) {
    throw new Error(`--flags tiene keys desconocidas: ${unknown.join(', ')} (válidas: ${FEATURE_FLAG_KEYS.join(', ')})`);
  }
  return Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, enabled.has(key)]));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { slug, name, 'owner-email': ownerEmail, 'operator-email': operatorEmail, whatsapp, flags } = args;

  if (!slug || !name || !ownerEmail || !operatorEmail) {
    console.error('Uso: npx tsx scripts/provision-store.ts --slug=... --name=... --owner-email=... --operator-email=... [--whatsapp=...] [--flags=stock,pos]');
    process.exit(1);
  }

  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const result = await provisionStore(supabaseAdmin, {
    slug,
    name,
    ownerEmail,
    operatorEmail,
    whatsappNumber: whatsapp ?? null,
    featureFlags: parseFlags(flags),
  });

  console.log(`Store creada: ${result.slug} (id ${result.storeId})`);
  console.log(`Dueño: ${ownerEmail} (${result.ownerInvited ? 'invitado ahora, le llegó un mail' : 'ya tenía cuenta'})`);
  console.log('feature_flags:', result.featureFlags);
  console.log('whatsapp_number:', result.whatsappNumber ?? '(null — usa el fallback de NEXT_PUBLIC_WHATSAPP_NUMBER)');
}

main().catch((error) => {
  console.error('Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
