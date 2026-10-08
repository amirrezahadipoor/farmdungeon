#!/usr/bin/env bash
# secret_guard.sh — قبل از هر commit: اگر توکن/راز در فایل‌ها بود، متوقف می‌کند (کد خروج ۱)
cd "$(dirname "$0")/.."
PAT='(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}|ghs_[A-Za-z0-9]{20,}|ghu_[A-Za-z0-9]{20,}|x-access-token:[A-Za-z0-9_]{20,}@)'
if [ -d .git ]; then FILES=$(git ls-files -co --exclude-standard); else FILES=$(find . -type f -not -path './node_modules/*' -not -path './.git/*'); fi
HIT=$(printf '%s\n' "$FILES" | grep -v -E '\.(png|gif|jpg|zip)$' | xargs -r grep -I -l -E "$PAT" 2>/dev/null | grep -v 'tools/secret_guard.sh' || true)
if [ -n "$HIT" ]; then echo "SECRET FOUND in:"; echo "$HIT"; exit 1; fi
echo "secret_guard: clean"
