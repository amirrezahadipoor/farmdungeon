// art/tree.js — S5.1: درخت‌های مزرعه — ۳ گونه × ۲ اندازه
//  ۰ بلوط (تاجِ پهنِ خوشه‌ای) · ۱ سیب‌دار (کنارِ آب — میوه‌ی ۲×۲ با هایلایت) · ۲ غان/سپیدار (باریکِ بلند، تنهِ روشن)
// تاج از **۶–۹ خوشه‌ی دایره‌ای** (سیلوئتِ دندانه‌دار، نه بیضی) با **۵ پله‌ی رمپ `leaf`**، نورِ بالا-چپ و
// **ditherِ بایرِ ایستا** در مرزِ تُن‌ها (بدونِ رنگِ تازه). تنه: خطوطِ پوست، ریشه‌ی شونه‌دار، ۲ شاخه‌ی دیده‌شونده.
// تاب: ۳ فریم (۰، ±۱) **فقط تاج**؛ کشِ `_full` با LRU. همه‌ی رنگ‌ها از رمپ‌ها ⇒ M5 بی‌آسیب.
import { Raster } from '../raster.js';
import { RAMP } from './ramps.js';
import { inkOutline } from './outline.js';
import { castShadow } from './shadow.js';
import { bayer4 } from './dither.js';
import { hash2 } from './noise.js';

const LV = RAMP.leaf, SL = RAMP.soil, BD = RAMP.bone, FR = RAMP.fire, CR = RAMP.clothRed, INK = RAMP.ink, SD = RAMP.sand;
// تُن‌های تاج: ۴ پله از ۵ (۳ تیره‌ترینِ لبه … ۶ روشن‌ترینِ بالا-چپ) — میانه‌ی وزن روی ۵ ⇒ ΔL(تاج، چمن) ≥ ۱۸
const CROWN = [LV[1], LV[2], LV[3], LV[4], LV[5], LV[6]];   // ۶ پله (۰ تیره‌ترینِ زیرِ تاج … ۵ روشن‌ترینِ بالا-چپ)

const SPEC = [
  { rx: 9.2, ry: 6.4, n: 8, cr: 3.3, th: 15, bw: 5, oak: 1, birch: 0, apple: 0 }, // بلوط (بلوط‌دانه)
  { rx: 8.4, ry: 6.2, n: 7, cr: 3.1, th: 14, bw: 4, oak: 0, birch: 0, apple: 5 }, // سیب‌دار (میوه)
  { rx: 6.4, ry: 7.6, n: 7, cr: 3.0, th: 19, bw: 3, oak: 0, birch: 1, apple: 0 }, // غان/سپیدار (آویزِ بذر)
];
const SIZES = [{ W: 30, H: 36, s: 1.00 }, { W: 26, H: 32, s: 0.84 }];

// ---------- نقاشیِ خوشه‌ای (با ردیابیِ تُن برای dither) ----------
function disc(can, tone, x, y, r, t) {
  const r2 = (r + 0.35) * (r + 0.35);
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(can.w - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(can.h - 1, Math.ceil(y + r));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const dx = xx - x, dy = yy - y;
    if (dx * dx + dy * dy > r2) continue;
    const i = yy * can.w + xx;
    if (tone[i] > t) continue;                       // تُنِ روشن‌تر را با تیره‌تر خراب نکن
    tone[i] = t; can.px(xx, yy, CROWN[t]);
  }
}
function paintCrown(can, sp, sz, seed) {
  const s = SIZES[sz].s;
  const cx = can.w / 2, cy = Math.round(sp.ry * s) + 1;
  const cl = [];
  for (let i = 0; i < sp.n; i++) {                   // ۶–۹ خوشه روی مدارِ بی‌نظم (سیلوئتِ دندانه‌دار)
    const a = (i / sp.n) * 6.283 + hash2(i, seed, 5) * 0.9;
    const rad = 0.52 + hash2(i, seed, 6) * 0.46;
    cl.push([cx + Math.cos(a) * sp.rx * rad * s, cy + Math.sin(a) * sp.ry * rad * s, sp.cr * (0.85 + hash2(i, seed, 7) * 0.55) * s]);
  }
  cl.push([cx + 1, cy + 1, sp.cr * 1.05 * s]);       // خوشه‌ی مرکزی
  cl.push([cx - 2, cy - 1, sp.cr * 0.95 * s]);       // خوشه‌ی مرکزیِ دوم (پرکردنِ حفره‌ها)
  cl.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));  // تیره‌ترین (پایین-راست) اول ⇒ روشنِ بالا-چپ روی
  const tone = new Int8Array(can.w * can.h).fill(-1);
  for (let i = 0; i < cl.length; i++) {
    const c = cl[i], lit = ((cx - c[0]) + (cy - c[1])) / (sp.rx + sp.ry) * s; // -۱ (پایین-راست) … +۱ (بالا-چپ)
    const t = Math.max(1, Math.min(5, Math.round(3.55 + lit * 1.6)));
    disc(can, tone, c[0], c[1], c[2], t);
  }
  // ditherِ ایستا در مرزِ تُن‌ها (نور از چپ/بالا) — رنگِ همسایه را قرض می‌گیرد ⇒ رنگِ تازه‌ای اضافه نمی‌شود
  for (let y = 0; y < can.h; y++) for (let x = 0; x < can.w; x++) {
    const i = y * can.w + x, t = tone[i];
    if (t < 0 || t >= 5) continue;
    if (x + 1 < can.w && tone[i + 1] > t && bayer4(x, y) < 0.5) { tone[i] = t + 1; can.px(x, y, CROWN[t + 1]); continue; }
    if (y + 1 < can.h && tone[i + can.w] > t && bayer4(x, y + 1) < 0.5) { tone[i] = t + 1; can.px(x, y, CROWN[t + 1]); }
  }
  for (let x = 0; x < can.w; x++) {                  // فرینجِ تیره‌ی زیرِ تاج (در جهتِ نور: زیر = تیره)
    let last = -1;
    for (let y = 0; y < can.h; y++) if (tone[y * can.w + x] >= 0) last = y;
    if (last < 0) continue;
    const t0 = bayer4(x, last) < 0.5 ? 0 : 1;
    for (let k = 0; k < 1; k++) { const y = last - k; if (y < 0) continue; const i = y * can.w + x;
      if (tone[i] < 0) continue; tone[i] = Math.min(tone[i], t0 + k); can.px(x, y, CROWN[tone[i]]); }
  }
  return { tone, cx, cy };
}

// ---------- تنه + ریشه + شاخه ----------
function paintTrunk(tr, sp, sz, seed) {
  const s = SIZES[sz].s, W = tr.w, H = tr.h;
  const base = H - 2, bw = sp.bw, x0 = Math.round(W / 2 - bw / 2);
  const th = Math.round(sp.th * s) + 4, top = Math.min(base - 8, base - th); // ۴px بالاتر از طولِ اسمی ⇒ تنه داخلِ تاج می‌رود (بدونِ فاصله)
  const dark = sp.birch ? BD[4] : SL[3], mid = sp.birch ? BD[6] : SL[5], lite = sp.birch ? BD[5] : SL[6];
  const dark2 = sp.birch ? BD[3] : SL[2], line = sp.birch ? BD[2] : SL[4];
  tr.rect(x0, top, bw, th, [mid[0], mid[1], mid[2], 255]);
  tr.rect(x0 + 1, top + 2, bw - 2, th - 4, [line[0], line[1], line[2], 255]);   // پوستِ میانی
  tr.rect(x0 + 1, top + 6, bw - 2, 2, [mid[0], mid[1], mid[2], 255]);            // نوارِ روشنِ میانی
  tr.px(x0 + bw - 2, top + th - 4, dark2);
  tr.rect(x0, top, 1, th, [lite[0], lite[1], lite[2], 255]);          // لبه‌ی روشنِ چپ (نور بالا-چپ)
  tr.rect(x0 + bw - 1, top + 1, 1, th - 1, [dark[0], dark[1], dark[2], 255]);
  for (let i = 0; i < 3; i++) {                                       // خطوطِ پوست (قطعی)
    const by = top + 2 + ((hash2(i, seed, 11) * (th - 5)) | 0), bh = 2 + ((hash2(i, seed, 12) * 2) | 0);
    tr.rect(x0 + 1 + (i % Math.max(1, bw - 2)), by, 1, bh, [dark[0], dark[1], dark[2], 255]);
  }
  // شاخه‌های دیده‌شونده (زیرِ لبه‌ی پایینِ تاج، بیرون از تنه)
  for (const dir of [-1, 1]) {
    const by = top + 3 + ((hash2(dir + 3, seed, 13) * 3) | 0);
    for (let k = 1; k <= 4; k++) tr.px(x0 + (dir < 0 ? -k + 1 : bw - 1 + k), by - ((k / 2) | 0), k > 2 ? [lite[0], lite[1], lite[2], 255] : [mid[0], mid[1], mid[2], 255]);
  }
  // ریشه‌ی شونه‌دار (۲ پله پهن‌تر) + لبه‌ی روشنِ شانه
  tr.rect(x0 - 1, base - 2, bw + 2, 2, [dark[0], dark[1], dark[2], 255]);
  tr.rect(x0 - 2, base, bw + 4, 1, [dark[0], dark[1], dark[2], 255]);
  tr.px(x0 - 1, base - 2, lite); tr.px(x0 - 2, base, mid);
  tr.rect(x0 + 1, base, bw - 2, 1, [dark2[0], dark2[1], dark2[2], 255]);        // شکافِ میانِ ریشه‌ها
  tr.rect(x0 - 2, base + 1, bw + 4, 1, INK[3]);                              // خطِ تماسِ تیره زیرِ ریشه
}

// جلای لبه‌ی بالا با **پله‌ی بعدیِ همان رمپ** (بدونِ رنگِ تازه) — جای applyRim که رنگِ آمیخته می‌ساخت
function rimPAL(can, tone) {
  const w = can.w, h = can.h;
  for (let x = 1; x < w - 1; x++) for (let y = 1; y < h - 1; y++) {
    const i = y * w + x;
    if (tone[i] < 0 || tone[i] >= 3) continue;
    if (tone[i - w] >= 0) continue;                  // فقط پیکسلِ لبه‌ی بالا
    tone[i]++; can.px(x, y, CROWN[tone[i]]);
  }
}

function build(sp, sz) {
  const { W, H } = SIZES[sz], seed = sp.n * 7 + sz * 3 + (sp.apple ? 1 : 0);
  const trunk = new Raster(W, H), canopy = new Raster(W, H);
  paintTrunk(trunk, sp, sz, seed);
  const { tone, cx, cy } = paintCrown(canopy, sp, sz, seed);
  if (sp.oak) {                                      // بلوط‌دانه‌ی ۲px (کلاهکِ soil + مغزِ sand)
    for (let i = 0; i < 3; i++) {
      const a = 0.25 + i * 0.95, ax = Math.round(cx + Math.cos(a) * sp.rx * 0.55), ay = Math.round(cy + Math.abs(Math.sin(a)) * sp.ry * 0.6) + 2;
      canopy.rect(ax, ay - 1, 2, 1, SL[2]); canopy.rect(ax, ay, 2, 2, SD[5]); canopy.px(ax, ay, SD[6]);
    }
  }
  if (sp.birch) {                                    // آویزِ بذرِ غان (۳ رشته)
    for (let i = 0; i < 3; i++) {
      const ax = Math.round(canopy.w / 2 - 3 + i * 3), ay = Math.round(cy + sp.ry * 0.72);
      canopy.rect(ax, ay, 1, 3, BD[5]); canopy.px(ax, ay - 1, LV[2]); canopy.px(ax, ay + 3, SD[6]);
    }
  }
  if (sp.apple) {                                    // سیب‌های ۲×۲ با یک هایلایت (رمپِ clothRed + fire)
    for (let i = 0; i < sp.apple; i++) {
      const a = -0.5 + i * 1.15, ax = Math.round(cx + Math.cos(a) * sp.rx * 0.62) , ay = Math.round(cy + Math.abs(Math.sin(a)) * sp.ry * 0.62) + 1;
      canopy.rect(ax, ay, 2, 2, CR[5]); canopy.px(ax, ay, FR[6]); canopy.px(ax + 1, ay + 1, CR[6]);
      canopy.px(ax + 1, ay - 1, LV[2]); canopy.px(ax, ay - 1, FR[5]);
    }
  }
  rimPAL(canopy, tone);                              // جلای لبه‌ی بالای تاج — فقط با پله‌های رمپ (پالت‌محور)
  return { trunk, canopy, W, H };
}

const _cache = new Map();                            // (گونه|اندازه) ⇒ {trunk,canopy}
const _full = new Map();                             // (گونه|اندازه|تاب) ⇒ فریمِ پخته — LRU
const FULL_MAX = 18;
function fullTree(sp, sz, sway) {
  const key = sp + '|' + sz + '|' + sway;
  let f = _full.get(key);
  if (f) return f;                                                   // اصابت: بدونِ لمس (هزینه‌ی صفر — مجموعه‌ی کاری ≤ سقف)
  const ck = sp + '|' + sz;
  let t = _cache.get(ck);
  if (!t) _cache.set(ck, t = build(SPEC[sp], sz));
  f = new Raster(t.W, t.H);
  t.trunk.over(f, 0, 0);
  t.canopy.over(f, sway, 0);                        // تاب فقط روی تاج (ستونِ بیرونی مثل قبل بریده می‌شود)
  inkOutline(f, { mode: 'sel' });
  _full.set(key, f);
  while (_full.size > FULL_MAX) _full.delete(_full.keys().next().value); // LRUِ تنبل: بیرون‌اندازی فقط هنگامِ پرشدن
  return f;
}

// برای QA/شیت: رسمِ صریحِ یک (گونه، اندازه)
export function drawTreeSp(r, sx, sy, sp, sz, sway = 0) {
  const f = fullTree(sp, sz, sway);
  const dx = sx + 8 - (f.w >> 1), dy = sy + 16 - f.h;
  castShadow(r, f, 'tr' + sp + sz, dx + 1, dy + 1, 28 + (sz ? 0 : 2));
  f.over(r, dx, dy);
}

// گونه: variant ۱ = کنارِ آب ⇒ سیب‌دار؛ وگرنه هشِ تایل بین بلوط/غان. اندازه: هشِ تایل (پایدار، مستقل از دوربین)
export function drawTree(r, sx, sy, variant, time, tx = 0, ty = 0) {
  const sp = (variant & 1) ? 1 : (hash2(tx, ty, 17) < 0.52 ? 0 : 2);
  const sz = hash2(tx, ty, 23) < 0.5 ? 0 : 1;
  const sway = Math.round(Math.sin(time * 0.85 + tx * 0.9 + ty * 0.37)); // تابِ آهسته ±۱px (کوانتیزه)
  const f = fullTree(sp, sz, sway);
  const dx = sx + 8 - (f.w >> 1), dy = sy + 16 - f.h;
  castShadow(r, f, 'tr' + sp + sz, dx + 1, dy + 1, 28 + (sz ? 0 : 2)); // S4.4: سایه از ماسکِ خودِ درخت
  f.over(r, dx, dy);
}
