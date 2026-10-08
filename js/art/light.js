// art/light.js — سیستم نور و تاریکی دانجن (جداشده از run_render.js)
// تاریکی پایه = مه آبی‌مه‌آلود (نه سیاهی مطلق)؛ نورها با «استامپ» از پیش‌محاسبه‌شده
import { Raster } from '../raster.js';
import { rp } from './ramps.js'; // S4.1: رنگِ نورها از رمپ‌های پالت (M5)
import { BAYER4 } from './dither.js'; // S4.2: کوانتیزه‌ی آلفای تاریکی با دیترِ ترتیبی

let DARK_R = 13, DARK_G = 11, DARK_B = 26; // S4.3: رنگِ تاریکی per تم (گریدینگ)
const DARK_A = 118;

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

// ---------- S4.3: گریدینگِ رنگی per تم — LUT ۲۵۶×۳ + ادغام با LUT تاریکی (یک گذر، هزینهٔ پیکسلیِ صفر) ----------
// grade = رنگِ سایه (= رنگِ تاریکی) + تینتِ هایلایت + کنتراست/اشباع (اشباع به‌صورتِ کنتراستِ تفاضلیِ کانالی تقریب زده می‌شود؛
// LUT یک‌بعدی کانالی نمی‌تواند درهم‌آمیزیِ لومای سه‌کاناله را بیان کند — یادداشتِ طراحی در P4.md)
export const THEME_GRADE = [
  { dark: [4, 6, 30], sh: [-6, -4, 10], hi: [-6, -10, 20], sat: 1.10 },  // 0 دخمه — سردِ آبی (تیره)
  { dark: [12, 16, 12], sh: [-4, 4, -6], hi: [6, 6, -8], sat: 1.00 },  // 1 خزه — سبز-زرد
  { dark: [26, 13, 10], sh: [10, 0, -6], hi: [12, 2, -8], sat: 1.10 }, // 2 آهنگری — گرمِ قرمز
  { dark: [34, 40, 52], sh: [4, 8, 14], hi: [14, 18, 30], sat: 0.90 },  // 3 یخ — آبی-سفیدِ مه‌آلود (روشن)
  { dark: [17, 17, 10], sh: [-2, 2, -8], hi: [4, 4, -8], sat: 0.95 },  // 4 باتلاق — سبز-قهوه‌ای
  { dark: [21, 16, 10], sh: [4, 2, -8], hi: [12, 6, -10], sat: 1.00 }, // 5 معدن — غبارِ طلایی
];
const GRADE_NEUTRAL = { dark: [13, 11, 26], sh: [0, 0, 0], hi: [0, 0, 0], sat: 1 }; // خنثی (QA/A-B)
let _gradeTheme = -2;
const _GR = new Uint8Array(65536), _GG = new Uint8Array(65536), _GB = new Uint8Array(65536);
const _G0R = new Uint8Array(256), _G0G = new Uint8Array(256), _G0B = new Uint8Array(256);
export function setThemeGrade(t, force) { // t: ۰..۵ = تم · ۱− = خنثی (force برای تست/QA)
  if (t === _gradeTheme && !force) return;
  _gradeTheme = t;
  const g = t >= 0 ? (THEME_GRADE[t] || THEME_GRADE[0]) : GRADE_NEUTRAL;
  DARK_R = g.dark[0]; DARK_G = g.dark[1]; DARK_B = g.dark[2];
  const k = g.sat, S = g.sh, H = g.hi;
  const cv = (v, sh, hi) => { const x = 128 + (v - 128) * k, w = 1 - x / 255, u = x / 255;
    const y = x + sh * w + hi * u; return y < 0 ? 0 : y > 255 ? 255 : y | 0; };
  const TR = new Uint8Array(256), TG = new Uint8Array(256), TB = new Uint8Array(256);
  for (let v = 0; v < 256; v++) { TR[v] = cv(v, S[0], H[0]); TG[v] = cv(v, S[1], H[1]); TB[v] = cv(v, S[2], H[2]); }
  _G0R.set(TR); _G0G.set(TG); _G0B.set(TB);
  const dr = DARK_R, dg = DARK_G, db = DARK_B;
  for (let a = 1; a < 256; a++) {
    const t = a / 255, it = 1 - t, q0 = a << 8;
    for (let v = 0; v < 256; v++) { const q = q0 | v;
      _GR[q] = TR[(v * it + dr * t + 0.5) | 0]; _GG[q] = TG[(v * it + dg * t + 0.5) | 0]; _GB[q] = TB[(v * it + db * t + 0.5) | 0]; }
  }
}

// ن۳۹: LUT بلند — out = src·(255−a)/255 + C·a/255 برای هر (a, src) از پیش محاسبه شده
// ۳×۶۴KB؛ حلقه‌ی بلند تبدیل به سه خواندنِ اندیس‌دار شد (~۳ برابر سریع‌تر)
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

// ---------- S4.2: کوانتیزه‌ی آلفای تاریکی به ۶ پله با آستانه‌ی Bayer4 (مختصاتِ **جهانی**) ----------
// پله‌ها هم‌بازه با **دامنه‌ی واقعیِ α** انتخاب شده‌اند (۰..DARK_A) و DARK_A خودش یک پله است ⇒
// ناحیه‌ی تختِ تاریک (۸۱٪ صفحه) **بیت‌به‌بیت دست‌نخورده** می‌ماند: نه بافتِ دیتر در پس‌زمینه، نه بایاسِ محیطی، نه هزینه.
// LUT یک‌بار ساخته می‌شود: _QLUT[(bayerIdx<<8)|a] = پله‌ی گردشده · ثابت در جهان ⇒ بدونِ شناوری هنگام حرکت دوربین
export const DARK_LEVELS = 6;
const QSTEP = DARK_A / (DARK_LEVELS - 1);
const _QLUT = new Uint8Array(16 * 256);
for (let b = 0; b < 16; b++) {
  const th = (BAYER4[b] + 0.5) / 16;
  for (let a = 0; a < 256; a++) {
    const sf = a / QSTEP, i = Math.floor(sf);
    _QLUT[(b << 8) | a] = Math.round(Math.min(DARK_LEVELS - 1, i + (sf - i > th ? 1 : 0)) * QSTEP);
  }
}
export const DITHER_DARK = { on: true };
export const GRADE = { off: false }; // QA/A-B: خاموش‌کردنِ گریدینگِ تم
const _rects = new Int16Array(4 * 33); // اسکرچ‌آرِ مستطیل‌های نور (تخصیصِ صفر در هر فریم)
// جدولِ فازِ افقی: cols[(camX&3)*W + x] = (x + camX) & 3 — چهار چرخش، یک‌بار در هر اندازهٔ صحنه
let _phW = 0, _phTab = null;
function phaseTab(w) {
  if (_phW === w) return _phTab;
  const t = new Uint8Array(4 * w);
  for (let r = 0; r < 4; r++) for (let x = 0; x < w; x++) t[r * w + x] = (x + r) & 3;
  _phW = w; _phTab = t; return t;
}
export function darkLevelCount() { return new Set(_QLUT).size; } // QA: تعداد سطوحِ α یکتای تاریکی (پذیرش ≤۶)

setThemeGrade(-1); // پیش‌فرض: گریدینگِ خنثی (هم‌رفتار با پیش از S4.3) — رندر دانجن تم را ست می‌کند

// flat = [x, y, rad, strength, ...] — لیست تختِ نورها (بدون تخصیص آبجکت)
export function applyDarkness(r, dk, flat, flatC, camX = 0, camY = 0) {
  const dd = dk.d;
  if (!dk._base || dk._base.length !== dd.length || dk._baseTheme !== _gradeTheme) { // S4.3: رنگِ تاریکی per تم
    dk._baseTheme = _gradeTheme;
    const b = dk._base = new Uint8ClampedArray(dd.length);
    for (let i = 0; i < b.length; i += 4) { b[i] = DARK_R; b[i + 1] = DARK_G; b[i + 2] = DARK_B; b[i + 3] = DARK_A; }
  }
  dd.set(dk._base); // کپی یک‌تکه‌ی پایه
  let nr = 0, coverAll = false; // S4.2: مستطیل‌های تأثیرِ نور (برای پاسِ کوانتیزه)
  for (let li = 0; li < flat.length; li += 4) {
    const lx = flat[li], ly = flat[li + 1], rad = flat[li + 2], strength = flat[li + 3];
    const st = lightStamp(rad, strength), n = st.n, cut = st.cut;
    const cx0 = Math.round(lx), cy0 = Math.round(ly);
    const x0 = Math.max(0, cx0 - rad), x1 = Math.min(r.w - 1, cx0 + rad);
    const y0 = Math.max(0, cy0 - rad), y1 = Math.min(r.h - 1, cy0 + rad);
    if (nr < 32) { const o = nr << 2; _rects[o] = x0; _rects[o + 1] = y0; _rects[o + 2] = x1; _rects[o + 3] = y1; nr++; } else coverAll = true;
    for (let y = y0; y <= y1; y++) {
      const srow = (y - cy0 + rad) * n - cx0 + rad;
      let di = (y * r.w + x0) * 4 + 3;
      for (let x = x0; x <= x1; x++, di += 4) {
        const v = dd[di] - cut[srow + x];
        dd[di] = v > 0 ? v : 0;
      }
    }
  }
  // ---------- S4.2: کوانتیزه‌ی α به ۶ پله با آستانه‌ی Bayer4 — فقط داخلِ ناحیه‌ی متأثر از نور ----------
  // ناحیه‌ی تختِ تاریک (α = DARK_A) بیرونِ این مستطیل‌ها است ⇒ بیت‌به‌بیت دست‌نخورده (بدون بافتِ دیتر، بدون بایاس، بدون هزینه)
  if (DITHER_DARK.on && nr) {
    if (coverAll) { const o = 0; _rects[o] = 0; _rects[o + 1] = 0; _rects[o + 2] = r.w - 1; _rects[o + 3] = r.h - 1; nr = 1; }
    // ادغامِ مستطیل‌های هم‌پوشان (تا جعبه‌ی محیطیِ کوچک‌تر بماند و هیچ پیکسلی دو بار کوانتیزه نشود؛ n ≤ ۳۲)
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < nr && !merged; i++) for (let j = i + 1; j < nr; j++) {
        if (!(_rects[(i << 2) + 2] < _rects[j << 2] || _rects[(j << 2) + 2] < _rects[i << 2] ||
              _rects[(i << 2) + 3] < _rects[(j << 2) + 1] || _rects[(j << 2) + 3] < _rects[(i << 2) + 1])) {
          if (_rects[j << 2] < _rects[i << 2]) _rects[i << 2] = _rects[j << 2];
          if (_rects[(j << 2) + 1] < _rects[(i << 2) + 1]) _rects[(i << 2) + 1] = _rects[(j << 2) + 1];
          if (_rects[(j << 2) + 2] > _rects[(i << 2) + 2]) _rects[(i << 2) + 2] = _rects[(j << 2) + 2];
          if (_rects[(j << 2) + 3] > _rects[(i << 2) + 3]) _rects[(i << 2) + 3] = _rects[(j << 2) + 3];
          nr--; _rects.copyWithin(j << 2, nr << 2, (nr << 2) + 4); merged = true; break;
        }
      }
    }
    const W2 = r.w, cols = phaseTab(W2), co = (camX & 3) * W2;
    for (let k = 0; k < nr; k++) {
      const rx0 = _rects[k << 2], ry0 = _rects[(k << 2) + 1], rx1 = _rects[(k << 2) + 2], ry1 = _rects[(k << 2) + 3];
      for (let y = ry0; y <= ry1; y++) {
        const rp = ((y + camY) & 3) << 2;
        let i = (y * W2 + rx0) * 4 + 3;
        for (let x = rx0; x <= rx1; x++, i += 4) {
          const a0 = dd[i];
          if (a0 > 0 && a0 !== DARK_A) dd[i] = _QLUT[((rp | cols[co + x]) << 8) | a0];
        }
      }
    }
  }
  // blend با LUT (ن۳۹) — بدون ضرب/تقسیم در حلقه
  const sd = r.d;
  for (let i = 0; i < dd.length; i += 4) {
    const a = dd[i + 3];
    if (a <= 0) { sd[i] = _G0R[sd[i]]; sd[i + 1] = _G0G[sd[i + 1]]; sd[i + 2] = _G0B[sd[i + 2]]; continue; } // S4.3: گریدینگِ نواحیِ کاملاً روشن
    if (sd[i + 3] < 8) { sd[i] = DARK_R; sd[i + 1] = DARK_G; sd[i + 2] = DARK_B; sd[i + 3] = a; continue; }
    const q = a << 8;
    sd[i] = _GR[q | sd[i]]; sd[i + 1] = _GG[q | sd[i + 1]]; sd[i + 2] = _GB[q | sd[i + 2]];
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
