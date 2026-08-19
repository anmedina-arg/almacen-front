import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // Los integration tests pegan contra el mismo proyecto Supabase de test
    // compartido — sin esto, un archivo puede ver de forma transitoria
    // filas mutadas por otro archivo corriendo en paralelo (confirmado
    // empíricamente en #16: con paralelismo, la suite falla ~3 de cada 5
    // corridas; sin él, estable en 5/5). Triggers pre-existentes como
    // log_stock_change dejan filas sin store_id por una fracción de
    // segundo, y el check global de backfill-store-id.test.ts las agarra
    // a mitad de camino si otro archivo corre al mismo tiempo.
    fileParallelism: false,
  },
});
