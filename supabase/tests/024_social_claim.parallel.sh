#!/usr/bin/env bash
# Two publisher runs at the same moment never claim the same post (run by scripts/test-db.sh with $PSQL set).
set -euo pipefail
$PSQL -c "insert into public.social_posts (format, status, scheduled_at) select 'image', 'approved', now() - interval '1 minute' from generate_series(1, 8);" >/dev/null
out=$(mktemp -d)
# each run holds its transaction open for a moment, so the two really overlap
for i in 1 2; do
  $PSQL -At -c "begin; select id from public.social_claim(5, 240); select pg_sleep(0.5); commit;" > "$out/$i" &
done
wait
a=$(grep -E '^[0-9a-f-]{36}$' "$out/1" | sort); b=$(grep -E '^[0-9a-f-]{36}$' "$out/2" | sort)
both=$(comm -12 <(echo "$a") <(echo "$b") | grep -c . || true)
total=$(echo "$a"$'\n'"$b" | grep -c . || true)
rm -rf "$out"
$PSQL -c "delete from public.social_posts" >/dev/null
[ "$both" = 0 ] || { echo "claimed twice: $both"; exit 1; }
[ "$total" = 8 ] || { echo "expected 8 claims (5 + 3), got $total"; exit 1; }
