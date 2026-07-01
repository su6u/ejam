#!/usr/bin/env bash
# Post-deploy health check for ejam.in
# Polls HEALTH_URL until it returns HTTP 200 or the timeout window expires.
# Called by ci.yml and deploy.yml after triggering the Dokploy webhook.
set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://ejam.in/}"
MAX_ATTEMPTS=20    # 20 × 15s = 5 minutes
SLEEP_SECONDS=15

echo "Waiting for deployment to become healthy at ${HEALTH_URL}"
echo "Max attempts: ${MAX_ATTEMPTS} (${SLEEP_SECONDS}s apart)"

attempt=0
while [ "$attempt" -lt "$MAX_ATTEMPTS" ]; do
  attempt=$((attempt + 1))
  echo -n "Attempt ${attempt}/${MAX_ATTEMPTS}: "

  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    --connect-timeout 5 \
    "${HEALTH_URL}" 2>/dev/null || echo "000")

  if [ "$STATUS" = "200" ]; then
    echo "HTTP ${STATUS} ✓ — deployment is healthy"
    exit 0
  fi

  echo "HTTP ${STATUS} — not ready yet"

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo ""
echo "Deployment did not become healthy after ${MAX_ATTEMPTS} attempts."
echo "Check Dokploy container logs for errors."
exit 1
