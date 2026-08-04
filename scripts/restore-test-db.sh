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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/pg-url.sh"

if parse_pg_url "$TEST_DB_URL"; then
  trap 'unset PGPASSWORD' EXIT
else
  echo "Error: TEST_DB_URL no tiene el formato esperado (postgresql://user:password@host:port/db)."
  exit 1
fi

echo "Esto va a BORRAR y recrear el schema 'public' completo en:"
echo "  $SAFE_DB_URL"
echo "Confirmá que esa es la URL del proyecto de TEST, no producción."
read -p "Escribí 'si' para continuar: " CONFIRM
if [ "$CONFIRM" != "si" ]; then
  echo "Cancelado."
  exit 1
fi

# Armamos un único archivo SQL en vez de encadenar varios -c/-f de psql:
# encadenar -c y -f no garantiza una sola sesión en todas las versiones de
# psql. \i dentro de un único -f sí corre todo en la misma sesión, garantizado.
WRAPPER_FILE="$(dirname "$DUMP_FILE")/.restore-wrapper-$$.sql"
FILTERED_DUMP="$(dirname "$DUMP_FILE")/.restore-filtered-$$.sql"
trap 'unset PGPASSWORD; rm -f "$WRAPPER_FILE" "$FILTERED_DUMP"' EXIT

# El dump (schema public) tiene 3 columnas con FK a auth.users
# (orders.user_id, orders.confirmed_by, profiles.id) — auth.users es
# administrado por Supabase y nunca vamos a poder satisfacer esas FKs contra
# el proyecto de test (sus UUIDs no tienen relación con los de producción).
# pg_dump agrega esas constraints al final vía ALTER TABLE ADD CONSTRAINT,
# que valida todas las filas existentes de la tabla en el momento — eso no
# lo evita session_replication_role (que solo desactiva triggers de
# INSERT/UPDATE, no la validación de una constraint nueva). La única forma
# real de saltear esto es no agregar esas 3 constraints puntuales.
#
# pg_dump emite cada ADD CONSTRAINT en 2 líneas ("ALTER TABLE ONLY x" y
# "ADD CONSTRAINT ...;"). Un grep -v línea por línea dejaría la primera
# línea huérfana sin punto y coma, corrompiendo el statement siguiente —
# por eso el filtro trabaja en pares y solo toca líneas que empiezan con
# "ALTER TABLE ONLY", dejando intactos los bloques COPY de datos (que
# pueden tener ";" literal dentro del contenido).
awk '
  /^ALTER TABLE ONLY/ {
    pending = $0
    getline nextline
    if (nextline ~ /REFERENCES auth\.users/) { next }
    print pending
    print nextline
    next
  }
  { print }
' "$DUMP_FILE" > "$FILTERED_DUMP"

# El filtro asume el formato de 2 líneas que pg_dump usa hoy para estas 3
# constraints puntuales — si algún día cambia (otra versión de pg_dump, un
# FK compuesto, etc.) preferimos fallar fuerte acá antes de restaurar, en
# vez de dejar pasar en silencio una referencia a auth.users que después
# rompería la carga con el mismo error de FK que resolvimos.
REMAINING=$(grep -c 'REFERENCES auth\.users' "$FILTERED_DUMP" || true)
if [ "$REMAINING" -ne 0 ]; then
  echo "Error: el filtro no eliminó todas las referencias a auth.users ($REMAINING quedan)."
  echo "Revisá el formato de scripts/restore-test-db.sh contra el dump actual antes de continuar."
  exit 1
fi

# \i corre dentro de psql.exe (binario nativo de Windows), que no entiende
# rutas estilo MSYS (/c/Users/...) salvo que se las pasemos como argv de
# línea de comando (ahí Git Bash las traduce solo). Como acá van como texto
# dentro del archivo SQL, hay que convertirlas explícitamente con cygpath.
if command -v cygpath >/dev/null 2>&1; then
  FILTERED_DUMP_WIN="$(cygpath -m "$FILTERED_DUMP")"
else
  FILTERED_DUMP_WIN="$FILTERED_DUMP"
fi

cat > "$WRAPPER_FILE" << SQLEOF
-- El dump solo incluye el schema public (ver backup-production.sh). pg_dump
-- moderno emite "CREATE SCHEMA public;" explícito, que ya existe de fábrica
-- en cualquier proyecto Supabase — lo recreamos primero para que quede
-- idempotente.
DROP SCHEMA IF EXISTS public CASCADE;
\i $FILTERED_DUMP_WIN
SQLEOF

echo "Restaurando $DUMP_FILE en el proyecto de test..."
psql "$SAFE_DB_URL" -v ON_ERROR_STOP=1 -f "$WRAPPER_FILE"

echo "Restauración completa."
