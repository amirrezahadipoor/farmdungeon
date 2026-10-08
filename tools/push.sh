#!/usr/bin/env bash
# push.sh — commit + push امن به GitHub (توکن هرگز در فایل/remote/لاگ ذخیره نمی‌شود)
# استفاده:  GITHUB_TOKEN=... GH_REPO=owner/repo bash tools/push.sh "art(S1.1): پیام"
# اختیاری: GH_BRANCH (پیش‌فرض main) · PUSH_URL_OVERRIDE (فقط برای تست محلی)
set -euo pipefail
cd "$(dirname "$0")/.."
MSG="${1:?commit message required}"
BR="${GH_BRANCH:-main}"
if [ -n "${PUSH_URL_OVERRIDE:-}" ]; then URL="$PUSH_URL_OVERRIDE"; else
  : "${GITHUB_TOKEN:?GITHUB_TOKEN is not set}"; : "${GH_REPO:?GH_REPO (owner/repo) is not set}"
  URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GH_REPO}.git"
fi
mask() { if [ -n "${GITHUB_TOKEN:-}" ]; then sed "s/${GITHUB_TOKEN}/***/g"; else cat; fi; }
bash tools/secret_guard.sh
[ -d .git ] || git init -q -b "$BR"
git config user.name  >/dev/null || git config user.name  "art-agent"
git config user.email >/dev/null || git config user.email "art-agent@users.noreply.github.com"
git add -A
if git diff --cached --quiet; then echo "nothing new to commit"; else git commit -q -m "$MSG"; echo "committed: $(git rev-parse --short HEAD)"; fi
git push "$URL" "HEAD:refs/heads/${BR}" 2>&1 | mask
echo "local : $(git rev-parse HEAD)"
echo "remote: $(git ls-remote "$URL" "refs/heads/${BR}" 2>&1 | mask | cut -f1)"
