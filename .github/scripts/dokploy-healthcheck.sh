#!/usr/bin/env bash
# Post-deploy health check for ejam.in
# Polls HEALTH_URL and the predictor API until both return HTTP 200 or the
# timeout window expires.
# Called by ci.yml and deploy.yml after triggering the Dokploy webhook.
set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://ejam.in/}"
PREDICT_HEALTH_URL="${PREDICT_HEALTH_URL:-${HEALTH_URL%/}/api/predict/jee-main?year=2025}"
PREDICT_HEALTH_BODY="${PREDICT_HEALTH_BODY:-{\"rank\":1,\"seat_type\":\"OPEN\",\"gender\":\"Gender-Neutral\",\"quota\":\"OS\",\"include_all\":true}}"
MAX_ATTEMPTS=20    # 20 × 15s = 5 minutes
SLEEP_SECONDS=15

echo "Waiting for deployment to become healthy at ${HEALTH_URL}"
echo "Predictor probe: ${PREDICT_HEALTH_URL}"
echo "Max attempts: ${MAX_ATTEMPTS} (${SLEEP_SECONDS}s apart)"

attempt=0
while [ "$attempt" -lt "$MAX_ATTEMPTS" ]; do
  attempt=$((attempt + 1))
  echo -n "Attempt ${attempt}/${MAX_ATTEMPTS}: "

  HOME_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    --connect-timeout 5 \
    "${HEALTH_URL}" 2>/dev/null || echo "000")

  PREDICT_BODY_FILE="$(mktemp)"
  PREDICT_STATUS=$(curl -sS -o "$PREDICT_BODY_FILE" -w "%{http_code}" \
    --max-time 20 \
    --connect-timeout 5 \
    -X POST \
    -H "Content-Type: application/json" \
    --data "$PREDICT_HEALTH_BODY" \
    "$PREDICT_HEALTH_URL" 2>/dev/null || echo "000")

  if [ "$HOME_STATUS" = "200" ] && [ "$PREDICT_STATUS" = "200" ]; then
    rm -f "$PREDICT_BODY_FILE"
    echo "home HTTP ${HOME_STATUS}, predictor HTTP ${PREDICT_STATUS} - deployment is healthy"
    exit 0
  fi

  echo "home HTTP ${HOME_STATUS}, predictor HTTP ${PREDICT_STATUS} - not ready yet"
  if [ "$PREDICT_STATUS" != "200" ]; then
    echo "Predictor response body:"
    sed 's/^/  /' "$PREDICT_BODY_FILE"
  fi
  rm -f "$PREDICT_BODY_FILE"

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo ""
echo "Deployment did not become healthy after ${MAX_ATTEMPTS} attempts."
echo "Check Dokploy container logs for errors."
exit 1
