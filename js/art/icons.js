// icons.js — آیکون‌های پیکسلی UI (به‌جای ایموجی) — S7.1: داده از icon_lib (روی رمپ) + پخت این‌جا
// پخت = پله‌ها → نورِ بالا-چپ (±۱ پله روی لبه) → حلقه‌ی ۱px جوهرِ یکدست (`ink` پله ۰) دورِ سیلوئت
// API تغییر نکرده: paintIcon(canvas, kind) · iconEl(kind, size)
import { rp } from './ramps.js';
import { ICONS, matOf, stepOf } from './icon_lib.js';

const INK = 7, EMPTY = -1;   // مقدارِ سلول: ۰..۶ پله · ۷ جوهر · ۱- خالی

// پخت یک آیکون: نگاشت → نورِ بالا-چپ → outline جوهر (بدون DOM — تست‌پذیر)
export function iconGrid(kind) {
  const art = ICONS[kind];
  if (!art) return null;
  const h = art.rows.length, w = art.rows[0].length;
  const step = new Int8Array(w * h).fill(EMPTY), mat = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = art.rows[y][x];
    if (ch === '.') continue;
    const i = y * w + x;
    step[i] = stepOf(art, ch); mat[i] = matOf(art, ch);
  }
  // اسنپ‌شاتِ بدنه (پله‌های ۰..۶) — outline باید از **این** ماسک رشد کند، نه از خودِ step
  // (وگرنه در همان پاس، خانه‌های تازه‌جوهرشده همسایه را جوهری می‌کنند و حلقه ۲–۳px می‌شود)
  const body = new Uint8Array(w * h), occ = new Uint8Array(w * h); // بدنه · اشغال (بدنه ∪ جوهرِ هنر)
  for (let i = 0; i < step.length; i++) {
    body[i] = (step[i] > EMPTY && step[i] !== INK) ? 1 : 0;
    occ[i] = step[i] > EMPTY ? 1 : 0;
  }
  // نورِ بالا-چپ: لبه‌ی بالا/چپ یک پله روشن‌تر · لبه‌ی پایین/راست یک پله تیره‌تر (فقط روی بدنه)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!body[i]) continue;
    const up = y > 0 ? body[i - w] : 0, lf = x > 0 ? body[i - 1] : 0;
    const dn = y < h - 1 ? body[i + w] : 0, rt = x < w - 1 ? body[i + 1] : 0;
    let s = step[i];
    if (!up || !lf) s += 1;
    else if (!dn || !rt) s -= 1;
    step[i] = s < 1 ? 1 : s > 6 ? 6 : s;
  }
  // outline جوهر ۱px: خانه‌ی خالی (نه بدنه، نه جوهرِ هنر) که مجاورِ **ماسکِ فریزشده** باشد
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (occ[i]) continue;
    if ((y > 0 && occ[i - w]) || (y < h - 1 && occ[i + w]) || (x > 0 && occ[i - 1]) || (x < w - 1 && occ[i + 1])) { step[i] = INK; mat[i] = 'ink'; }
  }
  return { w, h, step, mat };
}

// رنگِ یک خانه (برای ممیزی/تست — بدون DOM)
export function iconCellRGB(kind, i) {
  const g = iconGrid(kind);
  if (!g || i < 0 || i >= g.step.length) return null;
  const s = g.step[i];
  if (s <= EMPTY) return null;
  return s === INK ? rp('ink', 0) : rp(g.mat[i], s);
}

// بافرِ RGBA هم‌اندازه‌ی گرید (کش‌شده — آیکون‌ها ایستا هستند)
const cache = new Map();
export function iconImage(kind) {
  let d = cache.get(kind);
  if (d) return d;
  const g = iconGrid(kind);
  if (!g) return null;
  const data = new Uint8ClampedArray(g.w * g.h * 4);
  for (let i = 0; i < g.step.length; i++) {
    const s = g.step[i];
    if (s <= EMPTY) continue;
    const c = s === INK ? rp('ink', 0) : rp(g.mat[i], s);
    data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255;
  }
  d = { w: g.w, h: g.h, data };
  cache.set(kind, d);
  return d;
}

// نقاشی آیکون روی بوم موجود (با مقیاس صحیح، بدون AA)
export function paintIcon(cv, kind) {
  const img = iconImage(kind);
  if (!cv || !img) return;
  const c = cv.getContext('2d');
  if (!c) return; // محیطِ بدون پشتیبانیِ canvas (مثل jsdom خالی) — بی‌خطا بگذر
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cv.width, cv.height);
  const tmp = document.createElement('canvas');
  tmp.width = img.w; tmp.height = img.h;
  const tc = tmp.getContext('2d');
  if (!tc) return;
  const id = tc.createImageData(img.w, img.h);
  id.data.set(img.data);
  tc.putImageData(id, 0, 0);
  c.drawImage(tmp, 0, 0, img.w, img.h, 0, 0, cv.width, cv.height);
}

// ساخت المان بوم با آیکون (برای درج در DOM)
export function iconEl(kind, size = 16) {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  cv.className = 'pico';
  paintIcon(cv, kind);
  return cv;
}
