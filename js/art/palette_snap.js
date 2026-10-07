// art/palette_snap.js — قفل پالت (S1.6): هیچ پیکسلِ قهرمان/کارگر بیرون از پالت نماند
// قاعده: پیکسل خارج‌ازپالت → نزدیک‌ترین رنگ پالت؛ اگر پیکسل از آن رنگ روشن‌تر باشد (جلای rim)
// → پلهٔ روشن‌ترِ پالت (جهت نور حفظ شود). خروجی ⊆ پالت ⇒ هیچ رنگ سرِخودی ساخته نمی‌شود.
import { C } from './palette_hero.js';

export const LOCK = Object.values(C);                      // ۲۶ رنگ — سقف ۲۸
const LUM = LOCK.map((c) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114);

export function lockPAL(s) {
  const d = s.d;
  const ring = s.ringPx && new Set(s.ringPx);          // S1.7: پیکسل‌های حلقه‌ی outline معاف‌اند (رنگ انتخابی ماده)
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] <= 8 || (ring && ring.has(i))) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const L = r * 0.299 + g * 0.587 + b * 0.114;
    let bp = -1, bd = 1e9, bq = -1, bq2 = 1e9;             // bp: نزدیک‌ترین · bq: نزدیک‌ترینِ روشن‌تر
    for (let k = 0; k < LOCK.length; k++) {
      const c = LOCK[k], dr = r - c[0], dg = g - c[1], db = b - c[2], dd = dr * dr + dg * dg + db * db;
      if (dd < bd) { bd = dd; bp = k; }
      if (LUM[k] >= L - 2 && dd < bq2) { bq2 = dd; bq = k; }
    }
    if (bd === 0) continue;                                // رنگ دقیقاً از پالت
    const c = bq >= 0 && L - LUM[bp] > 10 ? LOCK[bq] : LOCK[bp];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  return s;
}
