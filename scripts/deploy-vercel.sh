#!/usr/bin/env bash
# Always deploy 對帳通 Check Pay to the PERMANENT production URL (paycheck.com.de).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PRODUCTION_URL="$(node -e "console.log(require('./deploy.config.json').productionUrl)")"
PRODUCTION_HOST="$(node -e "console.log(require('./deploy.config.json').productionHost)")"
PROJECT_NAME="$(node -e "console.log(require('./deploy.config.json').projectName)")"
PROJECT_ID="$(node -e "console.log(require('./deploy.config.json').projectId)")"
ORG_ID="$(node -e "console.log(require('./deploy.config.json').orgId)")"

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens"
  exit 1
fi

if [[ "${PRODUCTION_HOST}" != "paycheck.com.de" ]]; then
  echo "Refusing deploy: productionHost must stay paycheck.com.de (got ${PRODUCTION_HOST})"
  exit 1
fi

mkdir -p .vercel
cat > .vercel/project.json <<EOF
{"projectId":"${PROJECT_ID}","orgId":"${ORG_ID}","projectName":"${PROJECT_NAME}"}
EOF

echo "Deploying ${PROJECT_NAME} → ${PRODUCTION_URL}"
npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
echo "Live at: ${PRODUCTION_URL}"
