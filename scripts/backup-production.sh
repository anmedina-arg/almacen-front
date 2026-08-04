#!/bin/bash
# Backup completo (schema + datos) de la base de producción de Market del Cevil.
# No corre sola: necesita SUPABASE_DB_URL seteada en el entorno (ver docs/ops/backup-produccion.md).
set -e

command -v pg_dump >/dev/null || { echo "Error: pg_dump no está instalado o no está en el PATH."; exit 1; }

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL no está seteada."
  echo "Obtenela desde Supabase Dashboard > Project Settings > Database > Connection string (URI)."
  exit 1
fi

# Separamos la contraseña del resto de la connection string y la pasamos por
# PGPASSWORD en vez de en el argv de pg_dump — un argv con la contraseña queda
# visible para otros usuarios del mismo host vía `ps aux` mientras el dump corre.
if [[ "$SUPABASE_DB_URL" =~ ^postgres(ql)?://([^:]+):([^@]+)@(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[2]}"
  export PGPASSWORD="${BASH_REMATCH[3]}"
  trap 'unset PGPASSWORD' EXIT
  SAFE_DB_URL="postgresql://${DB_USER}@${BASH_REMATCH[4]}"
else
  echo "Error: SUPABASE_DB_URL no tiene el formato esperado (postgresql://user:password@host:port/db)."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$HOME/market-cevil-backups}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_FILE="$BACKUP_DIR/market-cevil-prod-$TIMESTAMP.sql"


# --schema=public: los schemas auth/storage/realtime/etc. los administra
# Supabase y ya existen en cualquier proyecto (incluido el de test) — si los
# incluyéramos, la restauración fallaría con "schema already exists".
pg_dump "$SAFE_DB_URL" --schema=public -f "$OUT_FILE"
chmod 600 "$OUT_FILE"

echo "Backup guardado en: $OUT_FILE"
