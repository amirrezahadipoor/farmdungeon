#!/usr/bin/env bash
# setup_tests.sh — آماده‌سازی محیط تست jsdom در /tmp/realtest (idempotent)
# استفاده: bash tools/setup_tests.sh   ·   اگر نصب است، سریع رد می‌شود.
set -euo pipefail
D=/tmp/realtest
if [ -d "$D/node_modules/jsdom" ] && [ -d "$D/node_modules/canvas" ]; then
  echo "setup_tests: ready ($D)"
  exit 0
fi
mkdir -p "$D"
cd "$D"
[ -f package.json ] || npm init -y >/dev/null 2>&1
npm install jsdom canvas --no-audit --no-fund >/tmp/setup_tests.log 2>&1 || { echo "setup_tests: npm FAILED — /tmp/setup_tests.log"; exit 1; }
node -e "require('jsdom'); require('canvas');" || { echo "setup_tests: import FAILED"; exit 1; }
echo "setup_tests: installed jsdom+canvas in $D"
