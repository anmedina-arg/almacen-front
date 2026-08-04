#!/bin/bash
# Restaura un dump de producción (generado por scripts/backup-production.sh)
# en el proyecto Supabase de test. No corre sola: necesita TEST_DB_URL seteada
# en el entorno y la ruta al dump como argumento (ver docs/ops/poblar-test-db.md).
set -e

command -v psql >/dev/null || { echo "Error: psql no está instalado o no está en el PATH."; exit 1; }

DUMP_FILE="$1"
if [ -z "$DUMP_FILE" ]; then
  echo "Uso: TEST_DB_URL=... ./scripts/restore-test-db.sh /ruta/al/dump.sql"
  exit 1
fi
if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: no existe el archivo $DUMP_FILE"
  exit 1
fi

if [ -z "$TEST_DB_URL" ]; then
  echo "Error: TEST_DB_URL no está seteada."
  echo "Obtenela desde el proyecto Supabase de TEST (no producción) > Project Settings > Database > Connection string (URI)."
  exit 1
fi

# Mismo criterio que backup-production.sh: la contraseña va por PGPASSWORD,
# nunca como parte del argv de psql.
if [[ "$TEST_DB_URL" =~ ^postgres(ql)?://([^:]+):([^@]+)@(.+)$ ]]; then
  DB_USER="${BASH_REMATCH[2]}"
  export PGPASSWORD="${BASH_REMATCH[3]}"
  trap 'unset PGPASSWORD' EXIT
  SAFE_DB_URL="postgresql://${DB_USER}@${BASH_REMATCH[4]}"
else
  echo "Error: TEST_DB_URL no tiene el formato esperado (postgresql://user:password@host:port/db)."
  exit 1
fi

echo "Restaurando $DUMP_FILE en el proyecto de test..."
# El dump solo incluye el schema public (ver backup-production.sh) — tablas
# como public.profiles tienen FKs a auth.users, que no está en el dump.
# session_replication_role = replica desactiva la verificación de FKs/triggers
# durante la carga para que eso no rompa la restauración.
psql "$SAFE_DB_URL" -v ON_ERROR_STOP=1 \
  -c "SET session_replication_role = replica;" \
  -f "$DUMP_FILE" \
  -c "SET session_replication_role = DEFAULT;"

echo "Restauración completa."
