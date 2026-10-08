// art/decal.js — دکال‌های خوشه‌ایِ پخته‌شده + نوارِ جنگلِ لبه‌ی نقشه (S2.9)
// همه چیز **هنگامِ پخت** در کشِ زمین کشیده می‌شود ⇒ حلقه‌ی هر فریم هیچ دکالی نمی‌کشد (درس ۵۷).
// جای‌گذاری: jitterِ قطعی روی مختصاتِ جهانی (hash2 یکنواخت) + چگالی از `c.db` (نزدیکیِ راه/آب) و نویزِ ماکرو.
import { TILE, E } from './palette_env.js';
import { hash2, fbm } from './noise.js';
import { rp } from './ramps.js';

const MACRO_F = 0.025;  // همان میدانِ ماکروی tuftBake در farm_terrain (بذر ۵۱) ⇒ دکال‌ها جایی می‌نشینند که چمن پرپشت‌تر است

// قالب‌های خوشه‌ای ۳–۶px (جایگزینِ دکورِ پیکسل‌منفردِ ن۳۶)
// '=' روشن (تیغه/رویه) · '-' میانی · '.' سایه · '*' گل · 'o' سنگِ روشن · '#' سنگ · ':' سایه‌ی سنگ
const TONE = { '=': rp('grass', 6), '-': rp('grass', 5), '.': rp('grass', 3) };
const FL = [E.flowerY, E.flowerW, E.berry];          // ۲–۳ رنگ از رمپ برای هر دسته‌گل
const ST = [E.stoneHi, E.stone, E.stoneSh];
const TPL = [
  ['  = ', ' =-=', '=-= ', ' .- '],        // تافتِ علف بلند (۴×۴)
  [' =-=', '=-==', ' .- '],                // شبدر (۴×۳)
  ['*   *', ' =-= ', ' -=- ', '  .  '],    // گل‌دسته (۵×۴)
  [' oo', '###', ' ::'],                   // سنگ‌ریزه (۳×۳) + سایه‌ی ۱px
];
function stamp(r, ti, x, y, fl) {
  const g = TPL[ti];
  for (let gy = 0; gy < g.length; gy++) for (let gx = 0; gx < g[gy].length; gx++) {
    const ch = g[gy][gx];
    if (ch === ' ') continue;
    const col = TONE[ch] || (ch === '*' ? fl : ch === 'o' ? ST[0] : ch === '#' ? ST[1] : ST[2]);
    r.px(x + gx, y + gy, col);
  }
}

// دکال‌های یک تایلِ چمن (فقط بیرونِ حصار: روی خاک/راه/آب/سازه هرگز دکال نمی‌آید)
export function bakeDecals(r, f, tx, ty, sx, sy) {
  const c = f.cell(tx, ty);
  if (c.kind !== 'grass' || f.insideFence(tx, ty)) return;
  const m = Math.abs(fbm((tx * TILE + 8) * MACRO_F, (ty * TILE + 8) * MACRO_F, 51, 2) - 0.5); // ۰..۰٫۵
  const p = (c.db ? 0.13 : 0.085) * (0.75 + m * 0.8); // چگالی: کنارِ راه/آب بیشتر + نویزِ ماکرو (کالیبره: ~۱۱٪ روی نقشهٔ واقعی)
  for (let i = 0; i < 2; i++) {                       // تا ۲ خوشه در تایل
    if (hash2(tx * 7 + i * 31, ty * 13 - i * 5, 71) >= p) continue;
    const t = (hash2(tx * 3 + i, ty * 5 + i * 17, 73) * 4) | 0;
    const gx = sx + 2 + ((hash2(tx * 11 + i * 7, ty * 3 - i, 79) * 8) | 0);  // ۲..۹ (عرض ≤۵ ⇒ در تایل)
    const gy = sy + 3 + ((hash2(tx * 5 - i * 3, ty * 7 + i * 11, 83) * 7) | 0); // ۳..۹ (ارتفاع ≤۴)
    stamp(r, t, gx, gy, FL[(hash2(tx + i * 13, ty * 3 + i, 89) * 3) | 0]);
  }
}

// نوارِ جنگلِ لبه‌ی نقشه (روی پرچینِ S2.8): تاج‌های درختِ پخته‌شده + زیرسایه‌ی انبوه، یک پله **تیره‌تر** از پرچین
// حاشیه‌ی ۲pxـه‌ی S2.8 (تاج/سایه/لبه‌ی روشن + سایه‌ی تماس روی چمن) دست‌نخورده می‌ماند ⇒ M8 لبه‌ی نقشه صفر می‌ماند
const F0 = rp('grass', 0), F1 = rp('grass', 1), F2 = rp('grass', 2), F3 = rp('grass', 3); // L۱۳/۲۵/۳۹/۵۲
function blob(r, cx, cy, rx, ry, col, x0, y0, x1, y1) { // بیضی با برش به جعبه (تا تاج‌ها روی لبه‌ی تایل نریزند)
  const r2 = rx * rx, y2 = ry * ry;
  for (let y = cy - ry; y <= cy + ry; y++) {
    if (y < y0 || y > y1) continue;
    for (let x = cx - rx; x <= cx + rx; x++) {
      if (x < x0 || x > x1) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx * y2 + dy * dy * r2 <= r2 * y2) r.px(x, y, col);
    }
  }
}
export function drawForest(r, sx, sy, tx, ty) {
  r.rect(sx + 2, sy + 2, 12, 12, F1);                  // زیرسایه‌ی انبوه (L۲۵)
  const x0 = sx + 1, y0 = sy + 1, x1 = sx + TILE - 2, y1 = sy + TILE - 2;
  for (let i = 0; i < 4; i++) {                        // ۴ تاجِ درخت با جابه‌جاییِ قطعی ⇒ نوار پیوسته می‌ماند
    const a = hash2(tx * 5 + i * 17, ty * 11 - i * 3, 91), b = hash2(i * 23 - ty, i * 7 + tx * 3, 97);
    const cx = sx + 4 + ((a * 8) | 0), cy = sy + 4 + ((b * 8) | 0);   // ۴..۱۱
    const rx = 3 + ((a * 3) | 0), ry = 2 + ((b * 2) | 0);             // ۳..۵ × ۲..۳
    blob(r, cx, cy + 1, rx, ry, F0, x0, y0, x1, y1);   // سایه‌ی زیرِ تاج (L۱۳)
    blob(r, cx, cy, rx, ry, F2, x0, y0, x1, y1);       // بدنه‌ی تاج (L۳۹)
    blob(r, cx - 1, cy - 1, rx - 1, ry - 1, F3, x0, y0, x1, y1); // رویه‌ی روشنِ بالا-چپ (L۵۲)
  }
}
