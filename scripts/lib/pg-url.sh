# Parsea una connection string postgresql://user:password@host:port/db,
# exporta la contraseña por PGPASSWORD (nunca en el argv de psql/pg_dump) y
# arma SAFE_DB_URL sin la contraseña. Usa la ÚLTIMA '@' como separador
# (regex greedy) para que contraseñas que contengan '@' se parseen bien.
#
# Uso: parse_pg_url "$ALGUNA_URL" || exit 1
# Deja DB_USER y SAFE_DB_URL seteadas, y PGPASSWORD exportada.
parse_pg_url() {
  local url="$1"
  if [[ "$url" =~ ^postgres(ql)?://([^:]+):(.+)@([^@]+)$ ]]; then
    DB_USER="${BASH_REMATCH[2]}"
    export PGPASSWORD="${BASH_REMATCH[3]}"
    SAFE_DB_URL="postgresql://${DB_USER}@${BASH_REMATCH[4]}"
    return 0
  fi
  return 1
}
