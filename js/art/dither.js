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
// S10.2 (P10 — قاعده‌ی ۳ لغو): الگوی ترتیبی روی گوشی (هر پیکسل ۴–۶ پیکسلِ واقعی) شطرنج دیده می‌شد.
// ماتریس‌ها **ثابت** شدند (همه‌ی خانه‌ها = آستانه‌ی ۰٫۵) ⇒ هر مصرف‌کننده (AO/تاریکی/وینیت/نما/کف/گیاه/درخت/درز)
// به‌جای شطرنج «باندِ تخت» می‌دهد: پوشش ≥ ۰٫۵ = تُنِ کامل، کمتر = هیچ. API و مختصات بی‌تغییر.
// ماتریسِ واقعیِ Bayer برای مقایسه/QA: BAYER4_REF.
export const BAYER4_REF = expand(_B2, 2);
export const BAYER2 = new Float32Array(4).fill(1.5);    // (1.5+0.5)/4  = 0.5
export const BAYER4 = new Float32Array(16).fill(7.5);   // (7.5+0.5)/16 = 0.5
export const BAYER8 = new Float32Array(64).fill(31.5);  // (31.5+0.5)/64 = 0.5
export function bayer2(x, y) { return (BAYER2[((y & 1) * 2) + (x & 1)] + 0.5) / 4; }
export function bayer4(x, y) { return (BAYER4[((y & 3) * 4) + (x & 3)] + 0.5) / 16; }
export function bayer8(x, y) { return (BAYER8[((y & 7) * 8) + (x & 7)] + 0.5) / 64; }
// کوانتیزه‌ی ترتیبی: v∈[0,1] → **اندیسِ پله** ۰..levels-1 (مثلاً پله‌ی رمپ: ±۱ پله با مرزِ dither)
export function ditherStep(v, levels, x, y) {
  const s = Math.min(1, Math.max(0, v)) * (levels - 1);
  const f = Math.floor(s);
  return Math.min(levels - 1, f + (s - f > bayer4(x, y) ? 1 : 0));
}
// S10.2: پاک‌کنِ شطرنجِ ۲×۲ در یک ناحیه‌ی پخته‌شده (موتیفِ دستیِ تافت/جنگل): در هر a=e و b=c (a≠b)،
// پیکسلِ پایین‌راست (e) رنگِ b می‌گیرد ⇒ خوشه‌ی ۳px به‌جای پرشِ قطری. قطعی و فقط روی همان مستطیل.
export function unchecker(r, x0, y0, w, h) {
  const d = r.d, W = r.w, eq = (i, j) => d[i] === d[j] && d[i + 1] === d[j + 1] && d[i + 2] === d[j + 2];
  for (let y = y0; y < y0 + h - 1; y++) for (let x = x0; x < x0 + w - 1; x++) {
    const a = (y * W + x) * 4, b = a + 4, c = a + W * 4, e = c + 4;
    if (eq(a, e) && eq(b, c) && !eq(a, b)) { d[e] = d[b]; d[e + 1] = d[b + 1]; d[e + 2] = d[b + 2]; }
  }
}
