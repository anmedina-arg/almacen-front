#!/bin/bash
# Corre supabase/supabase_backfill_store_id.sql vía psql (no el SQL Editor de
# Supabase, que envuelve todo el script pegado en una única transacción
# explícita y rompe el COMMIT dentro del loop del PROCEDURE — confirmado en
# el proyecto de test, ver docs/ops/backfill-store-id.md). psql ejecuta cada
# sentencia de nivel superior del archivo en su propia transacción
# autocommiteada por default, que es lo que este backfill necesita: cada
# CALL corre como transacción propia, permitiendo el COMMIT interno.
set -e

command -v psql >/dev/null || { echo "Error: psql no está instalado o no está en el PATH."; exit 1; }

if [ -z "$DB_URL" ]; then
  echo "Uso: DB_URL=postgresql://... ./scripts/run-backfill-store-id.sh"
  echo "Obtenela desde Supabase Dashboard > Project Settings > Database > Connection string (URI)"
  echo "del proyecto correspondiente (test o producción, según el paso del runbook en el que estés)."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/pg-url.sh"

if parse_pg_url "$DB_URL"; then
  trap 'unset PGPASSWORD' EXIT
else
  echo "Error: DB_URL no tiene el formato esperado (postgresql://user:password@host:port/db)."
  exit 1
fi

echo "Va a correr el backfill de store_id contra:"
echo "  $SAFE_DB_URL"
echo "Confirmá que es el proyecto correcto (test primero, producción después)."
read -p "Escribí 'si' para continuar: " CONFIRM
if [ "$CONFIRM" != "si" ]; then
  echo "Cancelado."
  exit 1
fi

psql "$SAFE_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/../supabase/supabase_backfill_store_id.sql"

echo "Backfill completo."
