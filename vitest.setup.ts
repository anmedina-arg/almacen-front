import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';

// Leemos SOLO NEXT_PUBLIC_SUPABASE_URL de .env.local para la comparación de
// abajo — a propósito NO usamos dotenv.config() sobre .env.local, porque eso
// cargaría el archivo completo (incluido SUPABASE_SERVICE_ROLE_KEY y otros
// secretos de producción) a process.env durante los tests.
function readProdSupabaseUrl(): string | undefined {
  if (!existsSync('.env.local')) return undefined;
  const content = readFileSync('.env.local', 'utf-8');
  const match = content.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

const prodUrl = readProdSupabaseUrl();

config({ path: '.env.test' });
const testUrl = process.env.TEST_SUPABASE_URL;

// Salvaguarda: si TEST_SUPABASE_URL termina apuntando al mismo proyecto que
// producción (.env.test mal configurado, copiado por error, etc.), cortamos
// toda la suite acá — antes de que cualquier test de integración llegue a
// ejecutar una sola query contra esa base.
if (testUrl && prodUrl && testUrl === prodUrl) {
  throw new Error(
    'TEST_SUPABASE_URL apunta al mismo proyecto que NEXT_PUBLIC_SUPABASE_URL (producción). ' +
      'Los tests de integración nunca deben correr contra producción — revisá .env.test.'
  );
}
