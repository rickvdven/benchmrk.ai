#!/usr/bin/env bash
# Runs all migrations on a throw-away local Postgres (with a small Supabase stub) and then the SQL tests in supabase/tests.
# Needs the Postgres server binaries (initdb, pg_ctl); set PG_BIN if they are not on the PATH.
set -euo pipefail
cd "$(dirname "$0")/.."
PG_BIN=${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}
export PATH="$PG_BIN:$PATH"
DIR=$(mktemp -d)
PORT=${PGPORT_TEST:-55432}
cleanup() { as_pg "$PG_BIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$DIR"
as_pg "$PG_BIN/initdb -D '$DIR/data' -U postgres -A trust >/dev/null"
as_pg "$PG_BIN/pg_ctl -D '$DIR/data' -o '-p $PORT -k $DIR' -l '$DIR/log' start >/dev/null"
export PGOPTIONS="-c client_min_messages=warning"
PSQL="psql -h $DIR -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f supabase/tests/supabase_stub.sql 2>/dev/null
for f in supabase/migrations/*.sql; do
  $PSQL -f "$f" >/dev/null || { echo "migration failed: $f"; exit 1; }
done
echo "migrations ok"
for t in supabase/tests/*.test.sql; do
  $PSQL -f "$t" >/dev/null
  echo "ok: $t"
done
