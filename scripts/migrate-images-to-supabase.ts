/**
 * Script de migración: Cloudinary → Supabase Storage
 *
 * Qué hace:
 *  1. Lee todas las URLs de imágenes de products.image y categories.image_url
 *  2. Descarga cada imagen desde Cloudinary
 *  3. La sube al bucket correspondiente en Supabase Storage
 *  4. Genera url-mapping.json con { old_url: new_url }
 *  5. Genera migrate-images.sql listo para ejecutar en Supabase SQL Editor
 *
 * Uso:
 *  npx tsx scripts/migrate-images-to-supabase.ts
 *
 * Requisitos:
 *  - tsx instalado: npm install -D tsx
 *  - Variables de entorno en .env.local:
 *      NEXT_PUBLIC_SUPABASE_URL
 *      SUPABASE_SERVICE_ROLE_KEY   ← necesita permisos de storage admin
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config — leer desde .env.local manualmente (no hay dotenv aquí)
// ---------------------------------------------------------------------------
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('.env.local no encontrado');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
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

const env = loadEnv();

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

// La service_role key bypasea RLS. Las opciones de auth son necesarias para
// que funcione correctamente en scripts Node (fuera del browser).
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Verificación rápida de que la key es service_role y no anon
const keyPayload = JSON.parse(Buffer.from(SERVICE_ROLE_KEY.split('.')[1], 'base64').toString());
if (keyPayload.role !== 'service_role') {
  console.error('❌ La key en SUPABASE_SERVICE_ROLE_KEY no es una service_role key (role actual: ' + keyPayload.role + ')');
  console.error('   Encontrala en Supabase Dashboard → Settings → API → service_role (secret)');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

function extFromContentType(contentType: string, fallback: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return fallback;
}

function filenameFromUrl(url: string, contentType: string): string {
  const urlPath = new URL(url).pathname;
  const segments = urlPath.split('/');
  const last = segments[segments.length - 1] ?? '';
  // Usar el nombre original si existe; si no, generar uno
  const hasExt = last.includes('.');
  if (hasExt) return last;
  const ext = extFromContentType(contentType, 'jpg');
  return `${last || Date.now()}.${ext}`;
}

async function uploadToSupabase(
  bucket: string,
  filename: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    });

  if (error) throw new Error(`Storage error (${bucket}/${filename}): ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🚀 Iniciando migración Cloudinary → Supabase Storage\n');

  // 1. Leer URLs de la DB
  const [{ data: products, error: pErr }, { data: categories, error: cErr }] = await Promise.all([
    supabase.from('products').select('id, image').not('image', 'is', null),
    supabase.from('categories').select('id, image_url').not('image_url', 'is', null),
  ]);

  if (pErr) throw new Error(`Error leyendo products: ${pErr.message}`);
  if (cErr) throw new Error(`Error leyendo categories: ${cErr.message}`);

  type UrlEntry = { table: 'products' | 'categories'; column: 'image' | 'image_url'; id: number; url: string };

  const entries: UrlEntry[] = [
    ...(products ?? [])
      .filter((p) => p.image?.includes('cloudinary'))
      .map((p) => ({ table: 'products' as const, column: 'image' as const, id: p.id, url: p.image as string })),
    ...(categories ?? [])
      .filter((c) => c.image_url?.includes('cloudinary'))
      .map((c) => ({ table: 'categories' as const, column: 'image_url' as const, id: c.id, url: c.image_url as string })),
  ];

  console.log(`📦 Imágenes a migrar: ${entries.length} (${(products ?? []).filter(p => p.image?.includes('cloudinary')).length} productos, ${(categories ?? []).filter(c => c.image_url?.includes('cloudinary')).length} categorías)\n`);

  if (entries.length === 0) {
    console.log('✅ No hay imágenes de Cloudinary. Nada que migrar.');
    return;
  }

  // 2. Migrar cada imagen
  const mapping: Record<string, string> = {};
  let ok = 0;
  let failed = 0;

  for (const entry of entries) {
    const bucket = entry.table === 'products' ? 'products' : 'categories';
    process.stdout.write(`  [${bucket}] ${entry.url.slice(-50)}... `);

    try {
      const { buffer, contentType } = await downloadImage(entry.url);
      const filename = filenameFromUrl(entry.url, contentType);
      const newUrl = await uploadToSupabase(bucket, filename, buffer, contentType);
      mapping[entry.url] = newUrl;
      ok++;
      console.log('✅');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      failed++;
    }
  }

  console.log(`\n✅ Migradas: ${ok} | ❌ Fallidas: ${failed}\n`);

  // 3. Guardar url-mapping.json
  const mappingPath = path.resolve(process.cwd(), 'scripts', 'url-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`📄 Mapping guardado en: scripts/url-mapping.json`);

  // 4. Generar SQL
  const sqlLines: string[] = [
    '-- Migración de URLs: Cloudinary → Supabase Storage',
    '-- Generado automáticamente por migrate-images-to-supabase.ts',
    '-- Ejecutar en Supabase SQL Editor\n',
  ];

  for (const entry of entries) {
    const newUrl = mapping[entry.url];
    if (!newUrl) continue;
    const table = entry.table;
    const col = entry.column;
    sqlLines.push(`UPDATE ${table} SET ${col} = '${newUrl}' WHERE ${col} = '${entry.url}';`);
  }

  const sqlPath = path.resolve(process.cwd(), 'scripts', 'migrate-images.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'));
  console.log(`📄 SQL generado en: scripts/migrate-images.sql`);
  console.log('\n⚠️  Revisá el SQL antes de ejecutarlo en producción.');
}

main().catch((err) => {
  console.error('\n💥 Error fatal:', err);
  process.exit(1);
});
