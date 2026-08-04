# Backup de producción

Proceso para respaldar la base de datos de producción (Supabase) antes de aplicar cualquier migración riesgosa — en particular, cada ticket de la Fase 1 y 2 de la migración multi-tenant (ver `docs/adr/`).

## Cómo correrlo

Este comando necesita la contraseña de la base de producción. **Corré este proceso en tu propia terminal, fuera de cualquier sesión de Claude Code** — la connection string no debe escribirse en un chat ni quedar en un historial de conversación.

1. Obtené la connection string desde Supabase Dashboard → Project Settings → Database → Connection string (URI).
2. En tu terminal:
   ```bash
   export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"
   ./scripts/backup-production.sh
   ```
3. El dump se guarda por defecto en `~/market-cevil-backups/` (fuera del repo — nunca se commitea). Podés cambiar el destino con `BACKUP_DIR=/otra/ruta`.

## Registro de backups tomados

| Fecha | Motivo | Ubicación |
|-------|--------|-----------|
| 2026-08-04 | Backup previo a arrancar la migración multi-tenant (ticket #7) | `~/market-cevil-backups/` |
