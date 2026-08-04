# Backup de producción

Proceso para respaldar la base de datos de producción (Supabase) antes de aplicar cualquier migración riesgosa — en particular, cada ticket de la Fase 1 y 2 de la migración multi-tenant (ver `docs/adr/`).

## Cómo correrlo

Este comando necesita la contraseña de la base de producción. **Corré este proceso en tu propia terminal, fuera de cualquier sesión de Claude Code** — la connection string no debe escribirse en un chat ni quedar en un historial de conversación.

Tampoco la escribas en una sola línea con `export` (queda guardada en el historial de tu shell, ej. `~/.bash_history`, con la contraseña en texto plano). Ingresala de forma interactiva:

1. Obtené el host y el usuario desde Supabase Dashboard → Project Settings → Database → Connection string (URI) (no hace falta copiar la contraseña ahí, solo el resto de los datos).
2. En tu terminal:
   ```bash
   read -s -p "Contraseña de la DB: " DB_PASS; echo
   export SUPABASE_DB_URL="postgresql://postgres:${DB_PASS}@[host]:5432/postgres"
   unset DB_PASS
   ./scripts/backup-production.sh
   ```
   `read -s` no muestra ni loguea lo que tipeás, y la contraseña nunca queda como parte de una línea de comando.
3. El dump se guarda por defecto en `~/market-cevil-backups/` (fuera del repo — nunca se commitea), con permisos restringidos (`600`, solo lectura para tu usuario). Podés cambiar el destino con `BACKUP_DIR=/otra/ruta`.

## Registro de backups tomados

| Fecha | Motivo | Ubicación |
|-------|--------|-----------|
| 2026-08-04 | Backup previo a arrancar la migración multi-tenant (ticket #7) | `~/market-cevil-backups/` |
