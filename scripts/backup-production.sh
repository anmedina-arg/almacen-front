#!/bin/bash
# Backup completo (schema + datos) de la base de producción de Market del Cevil.
# No corre sola: necesita SUPABASE_DB_URL seteada en el entorno (ver docs/ops/backup-produccion.md).
set -e

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL no está seteada."
  echo "Obtenela desde Supabase Dashboard > Project Settings > Database > Connection string (URI)."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$HOME/market-cevil-backups}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/market-cevil-prod-$TIMESTAMP.sql"

pg_dump "$SUPABASE_DB_URL" -f "$OUT_FILE"

echo "Backup guardado en: $OUT_FILE"
