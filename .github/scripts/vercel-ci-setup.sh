#!/usr/bin/env bash
set -euo pipefail

for var in VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN; do
  if [ -z "${!var:-}" ]; then
    echo "Missing ${var} — add it to GitHub repo or production environment secrets"
    exit 1
  fi
done

url="https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}"
if [[ "${VERCEL_ORG_ID}" == team_* ]]; then
  url="${url}?teamId=${VERCEL_ORG_ID}"
fi

status="$(
  curl -sS -o /tmp/vercel-project.json -w "%{http_code}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "${url}"
)"

if [ "${status}" != "200" ]; then
  echo "Vercel API returned HTTP ${status} when loading project settings (expected 200)"
  cat /tmp/vercel-project.json
  echo ""
  echo "This usually means an expired token, wrong org/project id, or missing team access."
  echo "Fix:"
  echo "  1. Regenerate VERCEL_TOKEN at https://vercel.com/account/tokens (Full Account scope)"
  echo "  2. Run: cd apps/web && vercel link && cat .vercel/project.json"
  echo "  3. Set VERCEL_ORG_ID, VERCEL_PROJECT_ID, VERCEL_TOKEN on GitHub production environment"
  exit 1
fi

rm -rf .vercel apps/web/.vercel
mkdir -p .vercel
printf '{"orgId":"%s","projectId":"%s"}\n' "${VERCEL_ORG_ID}" "${VERCEL_PROJECT_ID}" > .vercel/project.json
