import { config } from 'dotenv';

// .env.local tiene la config de producción (NEXT_PUBLIC_SUPABASE_URL);
// la cargamos solo para poder compararla contra la de test más abajo.
config({ path: '.env.local' });
const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

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
