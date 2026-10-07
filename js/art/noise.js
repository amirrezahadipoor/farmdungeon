// art/noise.js — نویزِ قطعی برای بافتِ تایل (S2.3): hash2 · vnoise · fbm · tileNoise (قابل‌دوخت)
// قاعده: صفر تصادفیِ زمانِ‌اجرا — همه‌چیز فقط از مختصات جهانی + seed مشتق می‌شود
// (درس ۷: خروجی باید بین پروسه‌ها/فریم‌ها یکسان باشد وگرنه تست و کش می‌لرزد).
// مقیاس: x/y بر حسب **پیکسل صحنه**؛ شبکه‌ی نویز ۱ پیکسل است (period = اندازه‌ی تایل).
export function hash2(x, y, seed = 0) { // [0,1) — هشِ صحیحِ ۳۲بیتی (یکنواخت، بدون هم‌بستگی مکانی)
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t); // smoothstep — نویز بدون شکستگی در گره‌ها
const mix = (a, b, t) => a + (b - a) * t;
const wrap = (v, p) => ((v % p) + p) % p;  // حلقوی (برای ورودی منفی هم درست)
export function vnoise(x, y, seed = 0) { // value-noise هموار، [0,1)
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return mix(mix(a, b, u), mix(c, d, u), v);
}
export function fbm(x, y, seed = 0, oct = 2) { // چنداکتاوی نرمال‌شده، [0,1)
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f, (seed + i * 1013) | 0);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return s / norm;
}
export function tileNoise(x, y, period, seed = 0) { // **قابل‌دوخت**: شبکه modulo period ⇒ تایلِ ۱۶×۱۶ بی‌درز
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const x0 = wrap(xi, period), y0 = wrap(yi, period);
  const x1 = wrap(xi + 1, period), y1 = wrap(yi + 1, period);
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return mix(mix(a, b, u), mix(c, d, u), v); // پیوسته روی درز: n(x+period) ≡ n(x) دقیقاً
}
export function tileFbm(x, y, period, seed = 0, oct = 2) { // همان، چنداکتاوی (هر اکتاو period خودش)
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * tileNoise(x * f, y * f, period * f, (seed + i * 1013) | 0);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return s / norm;
}
