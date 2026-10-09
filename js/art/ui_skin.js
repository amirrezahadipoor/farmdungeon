// ui_skin.js — S7.2: پوسته‌ی رویه‌ایِ UI (9-slice) از **رمپ** → dataURL → متغیرهای CSS (بدون فایل خارجی)
// تصویر = حلقه‌ی جوهر + نوارِ قاب (بالا/چپ روشن · پایین/راست تیره) + مرکزِ تخت (برای کششِ بی‌دردسر)
// نبودِ canvas (مثل jsdom خالی) ⇒ installSkins بی‌خطا `false` برمی‌گرداند و CSS همان نسخه‌ی تخت را نگه می‌دارد
import { rp } from './ramps.js';

// هر پوسته: ماده + پله‌ها (۰ تیره … ۶ روشن) + هندسه
export const SKIN_DEFS = {
  panelWood:  { mat: 'soil',      hi: 5, sh: 3, core: 2, ink: 1, size: 16, slice: 5, band: 2 },
  panelStone: { mat: 'stoneCool', hi: 5, sh: 3, core: 2, ink: 1, size: 16, slice: 5, band: 2 },
  btn:        { mat: 'metal',     hi: 6, sh: 3, core: 4, ink: 1, size: 16, slice: 5, band: 2 },
  btnDown:    { mat: 'metal',     hi: 3, sh: 5, core: 4, ink: 1, size: 16, slice: 5, band: 2 }, // نورِ برعکس ⇒ فشرده
  bar:        { mat: 'stoneCool', hi: 3, sh: 2, core: 1, ink: 1, size: 12, slice: 4, band: 2 },
  fillHp:     { mat: 'leaf',      hi: 5, sh: 3, core: 4, ink: 0, size: 12, slice: 4, band: 2 },
  fillBoss:   { mat: 'clothRed',  hi: 5, sh: 3, core: 4, ink: 0, size: 12, slice: 4, band: 2 },
};
export const SKIN_NAMES = Object.keys(SKIN_DEFS);

// پیکسل‌های یک پوسته (بدون DOM — تست‌پذیر): ۹ تکه با برشِ slice
export function skinPixels(name) {
  const d = SKIN_DEFS[name];
  if (!d) return null;
  const S = d.size, B = d.band;
  const px = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dT = y, dB = S - 1 - y, dL = x, dR = S - 1 - x;
    const edge = Math.min(dT, dB, dL, dR);
    let c;
    if (d.ink && edge === 0) c = rp('ink', 0);
    else if (edge < B) {
      let step;
      if (dT === edge && dT <= dL) step = d.hi;        // بالا
      else if (dB === edge && dB <= dR) step = d.sh;   // پایین
      else if (dL === edge) step = d.hi;               // چپ
      else step = d.sh;                                // راست
      c = rp(d.mat, step);
    } else c = rp(d.mat, d.core);
    const i = (y * S + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { w: S, h: S, slice: d.slice, px };
}

// ساختِ dataURL (نیاز به canvas) — در محیطِ بدونِ canvas خالی برمی‌گرداند
export function skinDataURL(name, doc) {
  const g = skinPixels(name);
  if (!g || !doc || !doc.createElement) return null;
  const cv = doc.createElement('canvas');
  cv.width = g.w; cv.height = g.h;
  const ctx = cv.getContext && cv.getContext('2d');
  if (!ctx || !ctx.createImageData || !cv.toDataURL) return null;
  const id = ctx.createImageData(g.w, g.h);
  id.data.set(g.px);
  ctx.putImageData(id, 0, 0);
  return cv.toDataURL('image/png');
}

// نصب روی document: --skin-* (فقط اگر canvas واقعاً در دسترس باشد)
export function installSkins(doc) {
  try {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || !d.createElement) return false;
    const probe = d.createElement('canvas');
    if (!(probe.getContext && probe.getContext('2d') && probe.toDataURL)) return false; // jsdom بدون canvas
    const st = (d.documentElement || d.body || {}).style;
    if (!st || !st.setProperty) return false;
    let n = 0;
    for (const name of SKIN_NAMES) {
      const url = skinDataURL(name, d);
      if (url) { st.setProperty('--skin-' + name, `url("${url}")`); n++; }
    }
    return n === SKIN_NAMES.length;
  } catch (e) { return false; } // هیچ‌وقت بوت را نشکن
}
