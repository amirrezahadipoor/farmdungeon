// art/light.js — سیستم نور و تاریکی دانجن (جداشده از run_render.js)
// تاریکی پایه = مه آبی‌مه‌آلود (نه سیاهی مطلق)؛ نورها با «استامپ» از پیش‌محاسبه‌شده
import { Raster } from '../raster.js';
import { rp } from './ramps.js'; // S4.1: رنگِ نورها از رمپ‌های پالت (M5)

const DARK_R = 13, DARK_G = 11, DARK_B = 26, DARK_A = 118;

// استامپ نور: cut = strength×(1−d²) از پیش‌محاسبه‌شده — کلید: rad×1000+strength
const _lightSt = new Map();
function lightStamp(rad, strength) {
  const key = rad * 1000 + strength;
  let st = _lightSt.get(key);
  if (!st) {
    const n = rad * 2 + 1, cut = new Uint8Array(n * n), inv = 1 / (rad * rad);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x - rad, dy = y - rad, d2 = (dx * dx + dy * dy) * inv;
      if (d2 < 1) cut[y * n + x] = Math.max(0, Math.round(strength * (1 - d2)));
    }
    st = { n, cut };
    _lightSt.set(key, st);
  }
  return st;
}

// ن۳۹: LUT بلند — out = src·(255−a)/255 + C·a/255 برای هر (a, src) از پیش محاسبه شده
// ۳×۶۴KB؛ حلقه‌ی بلند تبدیل به سه خواندنِ اندیس‌دار شد (~۳ برابر سریع‌تر)
const _LR = new Uint8Array(65536), _LG = new Uint8Array(65536), _LB = new Uint8Array(65536);
for (let a = 1; a < 256; a++) {
  const t = a / 255, it = 1 - t;
  for (let v = 0; v < 256; v++) {
    const q = (a << 8) | v;
    _LR[q] = Math.round(v * it + DARK_R * t);
    _LG[q] = Math.round(v * it + DARK_G * t);
    _LB[q] = Math.round(v * it + DARK_B * t);
  }
}


// ---------- S4.1: نور رنگی — استامپِ پیش‌محاسبه با کلیدِ عددی (صفر تخصیص در حلقهٔ رندر) ----------
// جدول رنگ‌ها: همه از رمپ‌های پالت (M5) — شناسهٔ رنگ، اندیسِ همان جدول است
const LCOL = [                                   // همه **دقیقاً** از رمپ‌ها (عضویتِ پالت ⇒ M5)
  rp('fire', 6),        // 0 مشعل — گرم
  rp('magicCyan', 6),   // 1 جادو/اسانس
  rp('clothRed', 6),    // 2 گدازه/باس
  rp('clothPurple', 6), // 3 محراب
  [242, 239, 228],      // 4 قهرمان — سفیدِ گرمِ ویژهٔ پالت
  rp('water', 6),       // 5 پله — آبیِ سردِ روشن
  rp('gold', 6),        // 6 طلا/کریستال
];
export const COLOR_LIGHTS = { on: true };   // S4.6/QA: خاموش‌کردنِ پاسِ رنگی
export const CL_DEBUG = { n: 0, c: null };   // شمارِ/لیستِ نورهای رنگیِ آخرین فریم (QA/audit)
export let C_RAD_CAP = 24;                  // سقفِ شعاعِ پاسِ رنگ (سایه‌زداییِ تاریکی مستقل و تا ۴۴px می‌رود؛ رنگ تا لبه لازم نیست)
export let C_MAX = 3;                       // سقفِ تعداد نورِ رنگی روی صفحه (مشخصه: ≤۶) — ارزان‌تر = پایدارتر
export function setColorRadCap(v) { C_RAD_CAP = v; }
export function setColorMax(v) { C_MAX = v; }
// نکتهٔ کارایی: `sd` از نوع Uint8ClampedArray است ⇒ `sd[i] += k` خودش اشباع می‌کند؛
// پس پاسِ رنگ **بدون LUT** انجام می‌شود (LUTِ تصادفیِ ۶۴KB کندتر از ضربِ سادهٔ int بود — اندازه‌گیری شد)
const _cSt = new Map();
function colorStamp(rad, strength, cid) {
  const key = ((rad << 8) | strength) * 8 + cid;
  let st = _cSt.get(key);
  if (!st) {
    const n = rad * 2 + 1, c = LCOL[cid] || LCOL[0];
    const add = new Uint8Array(n * n * 3), inv = 1 / (rad * rad);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x - rad, dy = y - rad, d2 = (dx * dx + dy * dy) * inv;
      if (d2 >= 1) continue;
      // ۸ پله‌ی کوانتیزه (پیکسل‌آرتِ تمیز؛ باندینگِ بیشتر با پاسِ S4.2 حل می‌شود)
      const q = d2 < 0.06 ? 1 : d2 < 0.16 ? 0.875 : d2 < 0.28 ? 0.75 : d2 < 0.42 ? 0.625 :
                d2 < 0.58 ? 0.5 : d2 < 0.72 ? 0.375 : d2 < 0.86 ? 0.25 : 0.125;
      if (!q) continue;
      const k = strength * q / 255, i3 = (y * n + x) * 3;
      add[i3] = c[0] * k; add[i3 + 1] = c[1] * k; add[i3 + 2] = c[2] * k;
    }
    st = { n, add };
    _cSt.set(key, st);
  }
  return st;
}

// flat = [x, y, rad, strength, ...] — لیست تختِ نورها (بدون تخصیص آبجکت)
export function applyDarkness(r, dk, flat, flatC) {
  const dd = dk.d;
  if (!dk._base || dk._base.length !== dd.length) {
    const b = dk._base = new Uint8ClampedArray(dd.length);
    for (let i = 0; i < b.length; i += 4) { b[i] = DARK_R; b[i + 1] = DARK_G; b[i + 2] = DARK_B; b[i + 3] = DARK_A; }
  }
  dd.set(dk._base); // کپی یک‌تکه‌ی پایه
  for (let li = 0; li < flat.length; li += 4) {
    const lx = flat[li], ly = flat[li + 1], rad = flat[li + 2], strength = flat[li + 3];
    const st = lightStamp(rad, strength), n = st.n, cut = st.cut;
    const cx0 = Math.round(lx), cy0 = Math.round(ly);
    const x0 = Math.max(0, cx0 - rad), x1 = Math.min(r.w - 1, cx0 + rad);
    const y0 = Math.max(0, cy0 - rad), y1 = Math.min(r.h - 1, cy0 + rad);
    for (let y = y0; y <= y1; y++) {
      const srow = (y - cy0 + rad) * n - cx0 + rad;
      let di = (y * r.w + x0) * 4 + 3;
      for (let x = x0; x <= x1; x++, di += 4) {
        const v = dd[di] - cut[srow + x];
        dd[di] = v > 0 ? v : 0;
      }
    }
  }
  // blend با LUT (ن۳۹) — بدون ضرب/تقسیم در حلقه
  const sd = r.d;
  for (let i = 0; i < dd.length; i += 4) {
    const a = dd[i + 3];
    if (a <= 0) continue;
    if (sd[i + 3] < 8) { sd[i] = DARK_R; sd[i + 1] = DARK_G; sd[i + 2] = DARK_B; sd[i + 3] = a; continue; }
    const q = a << 8;
    sd[i] = _LR[q | sd[i]]; sd[i + 1] = _LG[q | sd[i + 1]]; sd[i + 2] = _LB[q | sd[i + 2]];
  }
  // ---------- S4.1: پاسِ رنگ — افزودنی با clamp، روی تایل‌های روشن هم اعمال می‌شود ----------
  if (flatC && COLOR_LIGHTS.on) {
    CL_DEBUG.n = flatC.length / 5; CL_DEBUG.c = flatC;
    for (let i = 0; i < flatC.length; i += 5) {
      const rad = flatC[i + 2], strength = flatC[i + 3], cid = flatC[i + 4];
      const st = colorStamp(rad, strength, cid), n = st.n, add = st.add;
      const cx0 = Math.round(flatC[i]), cy0 = Math.round(flatC[i + 1]);
      const x0 = Math.max(0, cx0 - rad), x1 = Math.min(r.w - 1, cx0 + rad);
      const y0 = Math.max(0, cy0 - rad), y1 = Math.min(r.h - 1, cy0 + rad);
      let si = (y0 * r.w + x0) * 4, ai = ((y0 - cy0 + rad) * n - cx0 + rad) * 3;
      for (let y = y0; y <= y1; y++) {
        let s2 = si, a2 = ai;
        for (let x = x0; x <= x1; x++, s2 += 4, a2 += 3) {
          // فقط در «ناحیه‌ی روشن» رنگ اضافه می‌شود و به‌اندازه‌ی روشنایی وزن می‌گیرد
          const ar = add[a2];
          if (ar) {
            const lit = 255 - dd[s2 + 3];
            if (lit > 8) {
              sd[s2] += (lit * ar) >> 8;                          // اشباع خودکار (Uint8ClampedArray)
              const ag = add[a2 + 1]; if (ag) sd[s2 + 1] += (lit * ag) >> 8;
              const ab = add[a2 + 2]; if (ab) sd[s2 + 2] += (lit * ab) >> 8;
            }
          }
        }
        si += r.w * 4; ai += n * 3;
      }
    }
  }
}
