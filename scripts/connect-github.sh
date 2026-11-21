#!/usr/bin/env bash
# After you create https://github.com/archer0965/novastore (empty, no README),
# run: bash scripts/connect-github.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN="${GITHUB_TOKEN:-}"
if [[ -z "$TOKEN" && -d "$DIR/../docmate-ai" ]]; then
  TOKEN="$(cd "$DIR/../docmate-ai" && git remote get-url origin | sed -n 's#https://x-access-token:\([^@]*\)@.*#\1#p')"
fi
OWNER="${GITHUB_OWNER:-archer0965}"
NAME="${1:-novastore}"
BRANCH="$(cd "$DIR" && git branch --show-current)"
URL="https://x-access-token:${TOKEN}@github.com/${OWNER}/${NAME}.git"

# Ensure repo exists
code=$(curl -sS -o /tmp/ns-check.json -w "%{http_code}" \
  -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${OWNER}/${NAME}")
if [[ "$code" != "200" ]]; then
  echo "Repo ${OWNER}/${NAME} not found (HTTP $code)."
  echo "Please create an empty public repo first:"
  echo "  https://github.com/new?name=${NAME}"
  exit 1
fi

cd "$DIR"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$URL"
else
  git remote add origin "$URL"
fi

# Prefer main for independent product repo
git branch -M main
git push -u origin main
# Also push pricing branch if present
if git show-ref --verify --quiet refs/heads/cursor/novastore-pricing-4712; then
  git push -u origin cursor/novastore-pricing-4712 || true
fi
echo "Pushed → https://github.com/${OWNER}/${NAME}"
