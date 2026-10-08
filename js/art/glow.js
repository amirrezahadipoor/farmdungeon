// art/glow.js — S4.6: درخششِ ارزان (emissive stamp) — هاله‌ی شعاعیِ **پیش‌پخته** در ۳ اندازه،
// ترکیبِ **افزودنی با clamp** و **پس از تاریکی** رسم می‌شود ⇒ منبعِ نور در تاریکی «سوراخ» می‌کند.
// رنگ‌ها همه دقیقاً از رمپ‌های پالت‌اند (M5)؛ سقفِ ۸ درخشش روی صفحه + آستانه‌ی فاصله از دوربین.
// در Q.level=0 (کیفیتِ تطبیقی) کاملاً خاموش است. بدون تخصیص در حلقه‌ی رسم (استامپ‌ها یک‌بار پخته می‌شوند).
import { rp } from './ramps.js';
import { Q } from './quality.js';

export const GLOW = { on: true };                                  // توگل (QA/A-B)
export const GLOW_DEBUG = { n: 0, far: 0, over: 0, cap: 0 };       // شمارشِ آخرین فریم (QA/sheet)

const CAP = 8;                     // سقفِ درخشش روی صفحه (پذیرش S4.6)
const RAD = [9, 15, 24];           // ۳ اندازه (شعاعِ پیکسلی)
const FALL = 1.45;                 // توانِ افتِ شعاعی (۱ = خطی، بالاتر = هسته‌ی تنگ‌تر)
const MARGIN = 4;                  // آستانه‌ی فاصله از دوربین (پیکسل بیرونِ فریم)

// جدولِ رنگ‌ها — شناسه = اندیس (همه از رمپ‌ها)
export const GCOL = [
  rp('fire', 6),        // 0 مشعل/پنجره/گویِ آتش — گرم
  rp('magicCyan', 6),   // 1 اسانس/چشمِ روح
  rp('gold', 6),        // 2 پله/صندوق
  rp('clothPurple', 6), // 3 محراب
  rp('fire', 5),        // 4 گدازه/باسِ آتشین
  rp('clothRed', 6),    // 5 تیترِ خطر (باسِ غیرآتشین)
];

// استامپ‌های پیش‌پخته: ماسکِ تک‌کاناله (۰..۲۵۵) برای هر اندازه — رنگ در زمانِ رسم ضرب می‌شود
const STAMP = RAD.map((R) => {
  const w = 2 * R + 1, m = new Uint8Array(w * w);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const q = Math.sqrt(dx * dx + dy * dy) / R;
    if (q >= 1) continue;
    m[(dy + R) * w + dx + R] = Math.round(Math.pow(1 - q, FALL) * 255);
  }
  return { R, w, m };
});

// صفِ ثابت (بدون تخصیص): x, y, رنگ, اندازه, شدت, اولویت
const _x = new Int32Array(CAP), _y = new Int32Array(CAP), _c = new Uint8Array(CAP);
const _s = new Uint8Array(CAP), _i = new Uint8Array(CAP), _p = new Uint8Array(CAP);
let _n = 0;

export function glowBegin() { _n = 0; GLOW_DEBUG.cap = 0; }
export function glowCount() { return _n; }

// افزودنِ منبع؛ prio بالاتر = مهم‌تر (در سقفِ ۸ جای کم‌اولویت را می‌گیرد)
export function glowAdd(x, y, col, size, inten, prio = 1) {
  const xi = Math.round(x), yi = Math.round(y);
  if (_n < CAP) { _x[_n] = xi; _y[_n] = yi; _c[_n] = col; _s[_n] = size; _i[_n] = inten; _p[_n] = prio; _n++; return true; }
  let lo = 0;
  for (let k = 1; k < CAP; k++) if (_p[k] < _p[lo]) lo = k;
  if (prio <= _p[lo]) { GLOW_DEBUG.over++; return false; }
  _x[lo] = xi; _y[lo] = yi; _c[lo] = col; _s[lo] = size; _i[lo] = inten; _p[lo] = prio;
  GLOW_DEBUG.cap++; return true;
}

// رسم — پس از تاریکی (افزودنی + clamp). در Q.level=0 هیچ کاری نمی‌کند.
export function glowDraw(r) {
  GLOW_DEBUG.n = 0; GLOW_DEBUG.far = 0;
  if (!GLOW.on || !Q.level) return;
  const d = r.d, W = r.w, H = r.h;
  for (let k = 0; k < _n; k++) {
    const st = STAMP[_s[k]], R = st.R, w = st.w, m = st.m, cc = GCOL[_c[k]], inten = _i[k];
    const gx = _x[k], gy = _y[k];
    if (gx < -R - MARGIN || gy < -R - MARGIN || gx > W + R + MARGIN || gy > H + R + MARGIN) { GLOW_DEBUG.far++; continue; }
    GLOW_DEBUG.n++;
    const cr = cc[0], cg = cc[1], cb = cc[2];
    for (let dy = -R; dy <= R; dy++) {
      const py = gy + dy; if (py < 0 || py >= H) continue;
      const row = py * W, mi = (dy + R) * w;
      for (let dx = -R; dx <= R; dx++) {
        const px = gx + dx; if (px < 0 || px >= W) continue;
        const mm = m[mi + dx + R]; if (mm === 0) continue;
        const kk = (mm * inten) >> 8; if (kk === 0) continue;
        const o = (row + px) * 4;
        if (d[o + 3] < 8) continue;                                     // شفاف = بیرونِ نقشه
        const nr = d[o] + ((cr * kk) >> 8), ng = d[o + 1] + ((cg * kk) >> 8), nb = d[o + 2] + ((cb * kk) >> 8);
        d[o] = nr > 255 ? 255 : nr; d[o + 1] = ng > 255 ? 255 : ng; d[o + 2] = nb > 255 ? 255 : nb;
      }
    }
  }
}
