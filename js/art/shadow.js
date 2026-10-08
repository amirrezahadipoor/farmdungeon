// art/shadow.js — S4.4: سایه‌ی پرتابیِ اشیای مزرعه از ماسکِ آلفای خودِ اسپرایت
// (درخت، خانه، مترسک). قاعده: سایه = شکلِ خودِ شیء، کج‌شده به سمتِ مخالفِ خورشید و
// فشرده روی زمین — پایه ثابت می‌ماند، سرِ شیء بیشترین جابه‌جایی را می‌گیرد.
// ۸ باکتِ ساعتی (۰ = ظهر): ظهر کوتاه · عصر بلند به راست · صبح بلند به چپ · شب خاموش · باران ضعیف.
// هزینه: هر (شیء، باکت) یک‌بار پخته و کش می‌شود ⇒ فریمِ گرم فقط چند بازه‌ی ردیفی را می‌کشد
// (ماسک تک‌کاناله + جدولِ آمیزشِ ۲۵۶تایی per α ⇒ بدون ضربِ شناور در حلقه‌ی فریم).
import { Raster } from '../raster.js';
import { RAMP } from './ramps.js';
import { nightFactor, DAY_LEN } from '../night.js';

const PAD = 8;                 // حاشیه‌ی افقیِ کج‌شدگی (بیشینه طولِ سایه ۸px)
const VSQ = 0.28;              // عمقِ سایه روی زمین = ۲۸٪ ارتفاعِ شیء (زیرِ پایه، بیرونِ خودِ شیء)
const A_BASE = 70, A_TOP = 50; // چندپله‌ی α (بازه‌ی ۵۰–۷۰): نزدیکِ پایه تیره‌تر، دُمِ سایه روشن‌تر
const A_MIN = 20;              // زیر این آلفا اصلاً کشیده نمی‌شود
const RAIN_K = 0.45;           // باران: آسمانِ ابری ⇒ سایه‌ی ضعیف (نه حذف)
const ON_B = [1, 1, 1, 0, 0, 0, 1, 1]; // باکت‌های دارای سایه — ۳/۴/۵ شب‌اند (خاموش)
const CACHE_MAX = 64, CACHE_DROP = 16; // سقفِ حافظه: ۶۴×~۲KB ≈ ۱۲۸KB

export const SHADOW = { on: true }; // توگلِ سنجش (خاموش = بدونِ سایه‌ی پرتابی)
const _c = RAMP.grass[0];           // [6,15,12] — پله‌ی صفرِ گراس = رنگِ سایه (هم‌خانواده با زمین)
const COL = [_c[0], _c[1], _c[2]];
const _cache = new Map();
const S = { b: -1, m: 0, len: 0, dir: 1, rain: false };

export function shadowState() { return S; } // فقط خواندن — برای سنجه/دیباگ

// یک‌بار در فریم، پیش از رسم: باکت/جهت/طول/شدتِ سایه را از ساعتِ روز می‌سازد.
// مقادیر از *مرکزِ باکت* می‌آیند (نه لحظه‌ی جاری) ⇒ درونِ هر باکت ثابت و قابلِ کش.
export function shadowUpdate(dayT, raining = false) {
  const t = (((dayT % DAY_LEN) + DAY_LEN) % DAY_LEN) / DAY_LEN;
  const b = Math.round(t * 8) % 8;
  if (!SHADOW.on || !ON_B[b]) { S.b = -1; S.m = 0; S.rain = raining; return; }
  const tc = b / 8, s = Math.sin(2 * Math.PI * tc);
  S.b = b;
  S.m = (1 - nightFactor(tc * DAY_LEN)) * (raining ? RAIN_K : 1); // شدتِ مرکزِ باکت (پختِ یک‌بار در باکت)
  S.dir = s >= 0 ? 1 : -1;                                        // عصر: راست · صبح: چپ
  S.len = Math.max(2, Math.round(2 + 6 * Math.abs(s)));           // ظهر کوتاه · سپیده/غروب بلند
  S.rain = raining;
}

// کلیدهای کش — با تغییرِ باکت/باران یک‌بار ساخته می‌شوند (فریمِ گرم: صفر تخصیص)
let _sig = -1;
const _keys = new Map();
function _key(id) {
  const sig = (S.b + 1) * 2 + (S.rain ? 1 : 0);
  if (sig !== _sig) { _sig = sig; _keys.clear(); }
  let k = _keys.get(id);
  if (k === undefined) { k = id + '#' + S.b + (S.rain ? 'r' : ''); _keys.set(id, k); }
  return k;
}

// سایه از اسپرایتِ موجودِ شیء (کشِ خودش) — درخت: صفر پخت، فقط ماسک یک‌بار
export function castShadow(dst, src, id, ox, oy, base) {
  if (S.b < 0) return;
  _blit(_mask(_key(id), src, base), dst, ox, oy);
}

// سایه از تابعِ رسم (اشیایی که مستقیم روی بوم کشیده می‌شوند) — خانه/مترسک:
// اسپرایتِ موقت یک‌بار در حافظه پخته می‌شود، ماسک هم یک‌بار ⇒ فریمِ گرم صفر پخت.
export function castShadowDraw(dst, ox, oy, base, w, h, id, draw) {
  if (S.b < 0) return;
  const k = _key(id);
  let src = _cache.get('@' + k);
  if (!src) { src = new Raster(w, h); draw(src); _put('@' + k, src); }
  _blit(_mask(k, src, base), dst, ox, oy);
}

function _put(k, v) {
  _cache.set(k, v);
  if (_cache.size > CACHE_MAX) { const it = _cache.keys(); for (let i = 0; i < CACHE_DROP; i++) { const n = it.next(); if (n.done) break; _cache.delete(n.value); } }
}

// پختِ ماسک: سایه از خطِ پایه به سمت پایین کشیده می‌شود (بیرون از جای پای خودِ شیء)
// و هر ردیفِ اسپرایت با کج‌شدگیِ متناسبِ فاصله‌اش از پایه جابه‌جا می‌شود؛ α چندپله
// که نزدیکِ پایه تیره‌تر (تماس) و دُمِ سایه روشن‌تر است.
// خروجی: { a: آلفا تک‌کاناله، w، rx0/rx1/ra: بازه و α هر ردیف، bb: جعبه‌ی تنگ }
function _mask(key, src, base) {
  let m = _cache.get(key);
  if (m) return m;
  const W = src.w, H = src.h, ss = src.d, sw = W + PAD * 2;
  const MH = H + Math.round(base * VSQ) + 2; // سایه زیرِ اسپرایت ادامه می‌یابد
  const a = new Uint8Array(sw * MH), ra = new Uint8Array(MH);
  const rx0 = new Int16Array(MH).fill(1 << 14), rx1 = new Int16Array(MH).fill(-1);
  for (let y = 0; y <= base && y < H; y++) {
    const k = (base - y) / base;
    const dy = base + Math.round((base - y) * VSQ);
    if (dy < 0 || dy >= MH) continue;
    const al = Math.round((A_BASE - (A_BASE - A_TOP) * k) * S.m / 10) * 10; // چندپله: ۷۰/۶۰/۵۰ × شدت
    if (al < A_MIN) continue;
    const dx = PAD + Math.round(S.dir * S.len * k);
    for (let x = 0; x < W; x++) {
      if (ss[(y * W + x) * 4 + 3] < 8) continue; // فقط جایی که خودِ شیء هست
      const px = x + dx;
      a[dy * sw + px] = al; ra[dy] = al;
      if (px < rx0[dy]) rx0[dy] = px;
      if (px > rx1[dy]) rx1[dy] = px;
    }
  }
  let bx0 = 1 << 14, bx1 = -1, by0 = 1 << 14, by1 = -1;
  for (let y = 0; y < MH; y++) if (rx1[y] >= 0) { if (rx0[y] < bx0) bx0 = rx0[y]; if (rx1[y] > bx1) bx1 = rx1[y]; if (y < by0) by0 = y; by1 = y; }
  m = { a, ra, rx0, rx1, w: sw, h: MH, bb: bx1 < 0 ? null : [bx0, by0, bx1 + 1, by1 + 1] };
  _put(key, m);
  return m;
}

// جدولِ آمیزش: برای هر α (مضربِ ۱۰ ⇒ خانه‌ی ۲..۷) ۳×۲۵۶ بایت از پیش محاسبه می‌شود
// ⇒ حلقه‌ی فریم فقط چند lookup و نوشتنِ بایتی است (بدون ضرب/تقسیمِ شناور، بدون clamp).
const _LUT = new Uint8Array(8 * 3 * 256);
const _LUTon = new Uint8Array(8);
function _slot(al) {
  const j = al / 10;
  if (!_LUTon[j]) {
    const t = al / 255, it = 1 - t, o = j * 768;
    for (let v = 0; v < 256; v++) { _LUT[o + v] = Math.round(COL[0] * t + v * it); _LUT[o + 256 + v] = Math.round(COL[1] * t + v * it); _LUT[o + 512 + v] = Math.round(COL[2] * t + v * it); }
    _LUTon[j] = 1;
  }
  return j * 768;
}

function _blit(m, dst, ox, oy) {
  const bb = m.bb;
  if (bb === null) return;
  const dd = dst._u8 || (dst._u8 = new Uint8Array(dst.d.buffer));
  const dw = dst.w, dh = dst.h, sw = m.w, ax = m.a, ra = m.ra, rx0 = m.rx0, rx1 = m.rx1;
  const x0 = ox - PAD; // مختصاتِ ماسک → مقصد: dest = (x0 + mx, oy + my)
  let my0 = bb[1], my1 = bb[3];
  if (oy + my0 < 0) my0 = -oy;
  if (oy + my1 > dh) my1 = dh - oy;
  for (let my = my0; my < my1; my++) {
    let lo = rx0[my], hi = rx1[my]; // فقط بازه‌ی پرمحتوا، نه کلِ عرض
    if (hi < lo) continue;
    if (x0 + lo < 0) lo = -x0;
    if (x0 + hi + 1 > dw) hi = dw - x0 - 1;
    if (hi < lo) continue;
    const al = ra[my];
    if (al === 0) continue;
    const o = _slot(al);
    let si = my * sw + lo, di = ((oy + my) * dw + x0 + lo) * 4, n = hi - lo + 1;
    for (; n > 0; n--, si++, di += 4) {
      const v = ax[si];
      if (v === 0) continue;
      dd[di] = _LUT[o + dd[di]];
      dd[di + 1] = _LUT[o + 256 + dd[di + 1]];
      dd[di + 2] = _LUT[o + 512 + dd[di + 2]];
      if (v > dd[di + 3]) dd[di + 3] = v;
    }
  }
}
