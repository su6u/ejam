#!/usr/bin/env bash
# Post-deploy health check for ejam.in
# Polls HEALTH_URL and the predictor API until both are healthy or the timeout expires.
# Called by ci.yml and deploy.yml after triggering the Dokploy webhook.
set -euo pipefail

HEALTH_URL="${HEALTH_URL:-https://ejam.in/}"
PREDICTOR_HEALTH_URL="${PREDICTOR_HEALTH_URL:-${HEALTH_URL%/}/api/predict/jee-main}"
PREDICTOR_HEALTH_BODY="${PREDICTOR_HEALTH_BODY:-{\"rank\":1,\"seat_type\":\"OPEN\",\"gender\":\"Gender-Neutral\",\"quota\":\"OS\",\"state\":\"Andhra Pradesh\",\"has_ews_certificate\":false,\"include_all\":false}}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-20}"    # 20 x 15s = 5 minutes
SLEEP_SECONDS="${SLEEP_SECONDS:-15}"

echo "Waiting for deployment to become healthy at ${HEALTH_URL}"
echo "Predictor smoke URL: ${PREDICTOR_HEALTH_URL}"
echo "Max attempts: ${MAX_ATTEMPTS} (${SLEEP_SECONDS}s apart)"

check_homepage() {
  local status

  if ! status=$(curl -sS -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    --connect-timeout 5 \
    "${HEALTH_URL}" 2>/dev/null); then
    status="000"
  fi

  if [ "$status" = "200" ]; then
    echo -n "homepage HTTP ${status}; "
    return 0
  fi

  echo -n "homepage HTTP ${status}; "
  return 1
}

check_predictor() {
  local body_file
  local status

  body_file=$(mktemp)
  if ! status=$(curl -sS -o "$body_file" -w "%{http_code}" \
    --max-time 20 \
    --connect-timeout 5 \
    -X POST \
    -H "Content-Type: application/json" \
    --data "$PREDICTOR_HEALTH_BODY" \
    "${PREDICTOR_HEALTH_URL}" 2>/dev/null); then
    status="000"
  fi

  if [ "$status" = "200" ] && grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$body_file"; then
    rm -f "$body_file"
    echo "predictor HTTP ${status}"
    return 0
  fi

  echo "predictor HTTP ${status}"
  if [ -s "$body_file" ]; then
    echo "Predictor response excerpt:"
    tr '\n' ' ' < "$body_file" | cut -c 1-500
    echo ""
  fi
  rm -f "$body_file"
  return 1
}

attempt=0
while [ "$attempt" -lt "$MAX_ATTEMPTS" ]; do
  attempt=$((attempt + 1))
  echo -n "Attempt ${attempt}/${MAX_ATTEMPTS}: "

  if check_homepage && check_predictor; then
    echo "Deployment is healthy"
    exit 0
  fi

  echo "Deployment is not ready yet"

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo ""
echo "Deployment did not become healthy after ${MAX_ATTEMPTS} attempts."
echo "Check Dokploy container logs for errors."
exit 1
