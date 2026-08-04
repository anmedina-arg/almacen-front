# Poblar el proyecto Supabase de test

Restaura el dump de producción (ver `docs/ops/backup-produccion.md`) en el proyecto Supabase de test, para que los tests de integración de la migración multi-tenant corran contra datos representativos sin tocar producción nunca.

**El script borra y recrea el schema `public` completo del proyecto de test en cada corrida** (necesario para que la restauración sea idempotente) — pide confirmación explícita antes de hacerlo. Nunca apuntes `TEST_DB_URL` a producción.

**Diferencia deliberada con el schema de producción**: `orders.user_id`, `orders.confirmed_by` y `profiles.id` tienen FK a `auth.users` en producción. `auth.users` es administrado por Supabase y no se restaura (ni tendría sentido — sus UUIDs no coinciden con los de producción), así que el script excluye esas 3 constraints puntuales al restaurar. Las columnas existen igual, solo no tienen la FK enforced en el proyecto de test. No afecta ninguna de las tablas/relaciones de negocio que importan para los tests de aislamiento por Store.

## Cómo correrlo

Igual que el backup: **corré esto en tu propia terminal, fuera de cualquier sesión de Claude Code** — la connection string del proyecto de test no debe escribirse en un chat.

1. Asegurate de tener un dump reciente (`~/market-cevil-backups/market-cevil-prod-*.sql`, generado por `scripts/backup-production.sh`).
2. Obtené la connection string del proyecto de **test** (no producción) desde Supabase Dashboard → Project Settings → Database → Connection string (URI).
3. En tu terminal:
   ```bash
   read -s -p "Contraseña de la DB de test: " DB_PASS; echo
   export TEST_DB_URL="postgresql://postgres:${DB_PASS}@[host-de-test]:5432/postgres"
   unset DB_PASS
   ./scripts/restore-test-db.sh ~/market-cevil-backups/market-cevil-prod-<timestamp>.sql
   ```
4. Copiá `.env.test.example` a `.env.test` (gitignoreado) y completá `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` y `TEST_DB_URL` con los valores del proyecto de test — quedan disponibles para la suite de Vitest del ticket #9.

## Verificación

- `psql` corre con `-v ON_ERROR_STOP=1`: si algo del schema o los datos falla al restaurar, el script corta ahí mismo con error — una corrida que termina en "Restauración completa." ya es una señal fuerte de que el schema quedó idéntico al del dump.
- Chequeo rápido adicional (opcional, en tu terminal, con `psql "$TEST_DB_URL"`):
  ```sql
  select count(*) from products;
  select count(*) from orders;
  ```
  Comparar contra los mismos conteos en producción — deberían coincidir (el dump es un snapshot puntual).

## Registro

| Fecha | Dump restaurado | Notas |
|-------|------------------|-------|
| _(completar tras cada corrida)_ | | |
