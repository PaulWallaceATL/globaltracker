#!/usr/bin/env bash
# Push keys from .env.local → Vercel (production + preview + development).
# Usage: ./scripts/push-env-to-vercel.sh
# Requires: vercel CLI logged in (`vercel login`) and project linked (`vercel link`).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel@latest"
  exit 1
fi

# Keys the app actually reads (ignore extras like GROQ / ABSTRACT / typos).
KEYS=(
  ACLED_EMAIL
  ACLED_PASSWORD
  ACLED_API_KEY
  NASA_FIRMS_MAP_KEY
  AISSTREAM_IO_API_KEY
  NEWSAPI_ORG_API_KEY
  GNEWS_API_KEY
  NEWSDATA_IO_API_KEY
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  TOMTOM_API_KEY
  AVIATIONSTACK_API_KEY
  INGEST_SECRET
)

get_val() {
  local key="$1"
  # shellcheck disable=SC2002
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  [[ -z "$line" ]] && return 1
  local val="${line#*=}"
  # strip surrounding quotes
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  [[ -z "$val" ]] && return 1
  printf '%s' "$val"
}

echo "Pushing env from $ENV_FILE → Vercel (production, preview, development)"
echo "Tip: Sensitive values stay hidden after save — that is normal."
echo

pushed=0
skipped=0
for key in "${KEYS[@]}"; do
  if ! val="$(get_val "$key")"; then
    echo "skip  $key (empty / missing in .env.local)"
    skipped=$((skipped + 1))
    continue
  fi

  # Remove existing so we can overwrite (ignore errors if absent).
  for env in production preview development; do
    vercel env rm "$key" "$env" -y >/dev/null 2>&1 || true
  done

  # Add to all three environments.
  printf '%s' "$val" | vercel env add "$key" production preview development --sensitive >/dev/null
  echo "ok    $key"
  pushed=$((pushed + 1))
done

echo
echo "Done. Pushed $pushed · skipped $skipped"
echo "IMPORTANT: Redeploy so the runtime picks up new vars:"
echo "  vercel --prod"
echo
echo "Also delete mistyped keys in the Vercel UI if present:"
echo "  TONTON_API_KEY  (should be TOMTOM_API_KEY)"
