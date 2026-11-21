#!/usr/bin/env bash
# Update LINE Messaging API webhook to the permanent production URL.
set -euo pipefail

ENDPOINT="${1:-https://paycheck.com.de/api/line/webhook}"

if [[ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ]]; then
  echo "Set LINE_CHANNEL_ACCESS_TOKEN first (long-lived channel access token)."
  exit 1
fi

echo "Setting webhook → ${ENDPOINT}"
curl -sS -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\":\"${ENDPOINT}\"}"
echo
echo "Current endpoint:"
curl -sS -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
  https://api.line.me/v2/bot/channel/webhook/endpoint
echo
echo "Testing webhook…"
curl -sS -X POST "https://api.line.me/v2/bot/channel/webhook/test" \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\":\"${ENDPOINT}\"}"
echo
