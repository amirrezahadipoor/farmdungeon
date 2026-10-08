// art/bake.js — خط لولهٔ واحدِ پختِ اسپرایت (S6.1، Parity-first)
// ---------------------------------------------------------------------------
// چرا: هر مسیر (قهرمان/کارگر/موب/باس) پختِ خودش را داشت و ترتیبِ مراحل در سه فایل تکرار می‌شد.
// این ماژول **اجراکنندهٔ مراحل** است: شکل را هر مسیر خودش می‌کشد، سپس «دستورِ پخت» (recipe)
// به ترتیب اجرا می‌شود. مراحل و اعداد بدونِ تغییر از مسیرهای قبلی منتقل شده‌اند ⇒ برابریِ پیکسلی.
//
// مراحل موجود (همه idempotent-safe و بدونِ تخصیصِ اضافه در فریم — فقط زمانِ پخت):
//   half    : کاهش‌اندازهٔ ۲:۱ با «رأی اکثریتِ ۲×۲» (تساوی ← تیره‌تر) — رنگ تازه نمی‌سازد
//   recolor : تعویضِ پالتِ اسپرایت (کارگر مزرعه) — با تابعِ نقشهٔ بیرونی
//   rim     : جلای لبهٔ بالا (art/rim.js)
//   outline : خطِ دورِ ۱px — mode 'ink' (رمپ جوهری) یا 'sel' (تُنِ همان ماده)
//   flash   : فلش سفیدِ ضربه (روی پیکسل‌های مات)
//   shadow  : سایهٔ تماسِ ۵ باندی (M4) از جدولِ واحدِ CONTACT — زیرِ بدنه کامپوزیت می‌شود
//   lock    : قفلِ پالتِ قهرمان (palette_snap.js) + نشانِ rimDone
//   snap    : یکسان‌سازیِ پالت با پالتِ مستر (pm_snap.js)
//
// ترتیبِ رسمیِ پیشنهادی (S6.2+ هم همین را نگه می‌دارد):
//   شکل → [recolor] → [rim] → [outline] → [flash] → shadow → [half] → [lock | snap]
// مسیرِ فعلیِ قهرمان/کارگر نصف‌سازی را **پیش از** rim/outline انجام می‌دهد (۱px یکدست در مقیاسِ نهایی)
// و مسیرِ موب/باس snap را در پایان ⇒ دستورهای هر مسیر در فایلِ خودش صریح است.
import { Raster } from '../raster.js';
import { applyRim } from './rim.js';
import { inkOutline } from './outline.js';
import { lockPAL } from './palette_snap.js';
import { snapRaster } from './pm_snap.js';

// ---------- سایهٔ تماس: جدولِ واحدِ نسبی (rx, ry, اختلافِ y از لنگر, آلفا) ----------
// hero: ۵ باند روی یک لنگر · mob: شعاع‌ها از اندازهٔ بدنِ همان کیند · boss: ثابتِ بزرگ
export const CONTACT = {
  hero: () => [[13, 4, 0, 24], [11, 3, 0, 44], [9, 3, 0, 74], [7, 2, 0, 118], [5, 2, 0, 168]],
  mob: (sw, sh2) => [
    [sw + 6, sh2 + 3, 4, 24], [sw + 4, sh2 + 2, 3, 44], [sw + 2, sh2 + 1, 3, 74],
    [sw, sh2, 2, 118], [sw - 2, Math.max(1, sh2 - 1), 1, 168],
  ],
  boss: () => [[26, 9, 4, 24], [24, 8, 3, 44], [22, 7, 3, 74], [20, 6, 2, 118], [18, 5, 1, 168]],
};

// ---------- مراحل ----------
// نصف‌مقیاس ۲:۱ (ن۳۵) — «رأی اکثریت ۲×۲» جای میانگین جعبه‌ای (تساوی ← تیره‌تر)
// ⇒ هیچ رنگ تازه‌ای ساخته نمی‌شود (منبع: hero.js ن۳۵/S1.6؛ بایت‌به‌بایت منتقل شد)
function stHalf(s) {
  const t = new Raster(s.w >> 1, s.h >> 1);
  const td = t.d, sd = s.d, w2 = s.w;
  const cnt = new Map();
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    cnt.clear();
    let al = 0, best = -1, bestN = 0, bestL = 1e9;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = ((y * 2 + dy) * w2 + x * 2 + dx) * 4;
      if (sd[i + 3] <= 8) continue;
      if (sd[i + 3] > al) al = sd[i + 3];
      const k = (sd[i] << 16) | (sd[i + 1] << 8) | sd[i + 2];
      const n = (cnt.get(k) || 0) + 1; cnt.set(k, n);
      const L = sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114;
      if (n > bestN || (n === bestN && L < bestL)) { bestN = n; bestL = L; best = i; }
    }
    if (best < 0) continue;
    const j = (y * t.w + x) * 4;
    td[j] = sd[best]; td[j + 1] = sd[best + 1]; td[j + 2] = sd[best + 2]; td[j + 3] = al;
  }
  return t;
}
// سایهٔ تماس: باندها روی بومِ شفاف، سپس بدنه **روی** آن (ترتیبِ قبلیِ هر دو مسیر یکی بود)
function stShadow(s, st) {
  const layers = CONTACT[st.spec](...(st.size || []));
  const out = new Raster(s.w, s.h);
  const c = st.color;
  for (let i = 0; i < layers.length; i++) {
    const [rx, ry, dy, a] = layers[i];
    out.ellipse(st.x, st.y + dy, rx, ry, [c[0], c[1], c[2], a]);
  }
  s.over(out);
  return out;
}
// فلشِ ضربه: پیکسل‌های مات (α>۱۲۰) سفید می‌شوند.
// ⚠ حتماً از px() استفاده کن: px آلفا را blend و با max به‌روز می‌کند (بدنهٔ نیمه‌شفافِ روح ⇒ سفیدِ کامل).
//   نوشتنِ مستقیمِ RGB (بدونِ blend) برای روح ۵۴ فریم را عوض کرد — تستِ برابری همین را گرفت (S6.1).
function stFlash(s, st) {
  const d = s.d, w = s.w, h = s.h, c = st.color, minA = st.minA ?? 120;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > minA) s.px(x, y, c);
  }
  return s;
}
export const STEPS = {
  recolor: (s, st) => st.fn(s),                              // کارگر: نقشهٔ تعویضِ رنگ (art/recolor.js) در همین جای خط لوله
  half: (s) => stHalf(s),
  rim: (s, st) => { applyRim(s, st.hi ?? null, st.lift ?? 0.62, st.minA ?? 120); return s; },
  outline: (s, st) => { inkOutline(s, { mode: st.mode || 'sel' }); return s; },
  flash: (s, st) => stFlash(s, st),
  shadow: (s, st) => stShadow(s, st),
  lock: (s) => { lockPAL(s); s.rimDone = true; return s; },   // rimDone: تماس‌های بعدیِ applyRim بی‌اثر
  snap: (s) => { snapRaster(s); return s; },
};

// اجراکنندهٔ خط لوله — shape یا یک Raster است یا تابعی که Raster تازه می‌سازد
export function bake(shape, steps = []) {
  let cur = typeof shape === 'function' ? shape() : shape;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i], next = STEPS[st.op](cur, st);
    if (next) cur = next;
  }
  return cur;
}

// ---------- کشِ اسپرایت (سقف‌دار) ----------
// رفتارِ قبلیِ Monster._cache: Map با سقفِ ۳۰۰ و حذفِ ۹۰ قدیمی‌ترین **در ترتیبِ درج**.
// کلیدها فریم‌های تغییرناپذیرند ⇒ ترتیبِ دسترسی مهم نیست (LRUِ واقعی بی‌فایده بود) و همین
// سیاست عیناً حفظ شده تا مصرفِ حافظه و رفتارِ پخت عوض نشود.
export function makeSpriteCache(cap = 300, evict = 90) {
  const m = new Map();
  return {
    get size() { return m.size; },
    get: (k) => m.get(k),
    set: (k, v) => {
      m.set(k, v);
      if (m.size > cap) { const it = m.keys(); for (let i = 0; i < evict; i++) { const q = it.next(); if (q.done) break; m.delete(q.value); } }
    },
    clear: () => m.clear(),
  };
}
