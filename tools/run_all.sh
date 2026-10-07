#!/usr/bin/env bash
# run_all.sh — همه‌ی تست‌های پروژه در یک فرمان: نصب → بیلد → بوت jsdom → رگرسیون رندر
# استفاده: bash tools/run_all.sh   ·   خروجی موفق: خط «ALL GREEN» با شمارش PASS هر بخش
set -euo pipefail
cd "$(dirname "$0")/.."
bash tools/setup_tests.sh
pass() { # pass <نام> <فرمان...> — خروجی: «نام: n PASS» یا اولین خطا
  local name=$1; shift
  local out
  if ! out=$("$@" 2>&1); then echo "FAIL: $name"; printf '%s\n' "$out" | tail -8; exit 1; fi
  echo "$name: $(printf '%s\n' "$out" | grep -c '^PASS' || true) PASS"
}
echo "— build";  node tools/build_single.mjs
echo "— boot";   pass "boot_check" node tools/boot_check.mjs
echo "— render"; pass "render5"    node tools/render5.mjs
echo "— render"; pass "render6"    node tools/render6.mjs
echo "ALL GREEN"
