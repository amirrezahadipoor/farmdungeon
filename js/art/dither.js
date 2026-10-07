// art/dither.js — کوانتیزه‌ی ترتیبی (S2.3): ماتریس‌های Bayer 2/4/8 + ditherStep
// مختصات **جهانی** (پیکسل صحنه) نه محلیِ تایل ⇒ الگو بین تایل‌های مجاور پیوسته می‌ماند (درس ۴۰).
// آستانه‌ها در بازه‌ی (۰،۱) هستند (مرکز خانه‌ها: (i+۰٫۵)/N²) تا نه ۰ نه ۱ تولید شود.
const _B2 = new Uint8Array([0, 2, 3, 1]); // ۲×۲ استاندارد
function expand(Bn, n) {                  // ساخت بازگشتی: B_2n = ۴·B_n + الگوی B2 در هر ربع
  const m = n * 2, out = new Uint8Array(m * m);
  for (let y = 0; y < m; y++) for (let x = 0; x < m; x++)
    out[y * m + x] = 4 * Bn[(y % n) * n + (x % n)] + _B2[((y / n) | 0) * 2 + ((x / n) | 0)];
  return out;
}
export const BAYER2 = _B2;
export const BAYER4 = expand(_B2, 2);
export const BAYER8 = expand(BAYER4, 4);
export function bayer2(x, y) { return (BAYER2[((y & 1) * 2) + (x & 1)] + 0.5) / 4; }
export function bayer4(x, y) { return (BAYER4[((y & 3) * 4) + (x & 3)] + 0.5) / 16; }
export function bayer8(x, y) { return (BAYER8[((y & 7) * 8) + (x & 7)] + 0.5) / 64; }
// کوانتیزه‌ی ترتیبی: v∈[0,1] → **اندیسِ پله** ۰..levels-1 (مثلاً پله‌ی رمپ: ±۱ پله با مرزِ dither)
export function ditherStep(v, levels, x, y) {
  const s = Math.min(1, Math.max(0, v)) * (levels - 1);
  const f = Math.floor(s);
  return Math.min(levels - 1, f + (s - f > bayer4(x, y) ? 1 : 0));
}
