#!/bin/bash
# Backup completo (schema + datos) de la base de producción de Market del Cevil.
# No corre sola: necesita SUPABASE_DB_URL seteada en el entorno (ver docs/ops/backup-produccion.md).
set -e

command -v pg_dump >/dev/null || { echo "Error: pg_dump no está instalado o no está en el PATH."; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/pg-url.sh"

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL no está seteada."
  echo "Obtenela desde Supabase Dashboard > Project Settings > Database > Connection string (URI)."
  exit 1
fi

if parse_pg_url "$SUPABASE_DB_URL"; then
  trap 'unset PGPASSWORD' EXIT
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
# --no-owner --no-privileges: el rol "postgres" de Supabase no es superusuario
# real (Supabase se lo restringe) — no puede aplicar ALTER DEFAULT PRIVILEGES/
# GRANT/OWNER TO de otro proyecto al restaurar. El proyecto de destino ya
# tiene sus propios roles y privilegios de fábrica; no hace falta replicar
# los de origen. Esto no afecta las RLS policies, que son parte del schema.
pg_dump "$SAFE_DB_URL" --schema=public --no-owner --no-privileges -f "$OUT_FILE"
chmod 600 "$OUT_FILE"

echo "Backup guardado en: $OUT_FILE"
