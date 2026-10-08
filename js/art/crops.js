// art/crops.js — S5.2: محصولات ۶ مرحله‌ای (۰ دانه · ۱ جوانه · ۲ نهال · ۳ میانی · ۴ تقریباً رسیده · ۵ رسیده)
// بومِ محصول ۱۶×۲۴ و «خطِ کاشت» = ردیفِ BV=۲۱ ⇒ ساقه روی sy+13 می‌نشیند (هم‌راستا با سایه‌ی تماسِ farm_render)
// قاعده‌ها: رنگ فقط از رمپ‌های E (پالیت‌محور) · منطقِ رشدِ گیم‌پلی دست‌نخورده (مرحله از farm.vstage) · پختِ یک‌باره در کش
import { TILE, E } from './palette_env.js';
import { Raster } from '../raster.js';
import { bayer4 } from './dither.js';

export const CROP_STAGES = 6;
export const CROP_LIFT = 8;                  // CH − TILE: در farm_render از sy کم می‌شود (بلندیِ بالای تایل)
const CW = 16, CH = 24, BY = 21;             // BY = ردیفِ خاک (پایه‌ی گیاه)
const _c = new Map(), _i = new Map();
const dz = (x, y) => bayer4(x, y) < 0.5;     // ditherِ ایستای بایر (بافتِ میوه/برگ)

// ---------- سازنده‌های پایه ----------
const nub = (r, c) => { r.px(8, BY, E.soilSh); r.px(8, BY - 1, c); };                       // ۰: دانه در خاکِ تازه
const leaf2 = (r, x, y, dx, c, hi) => { r.line(x, y, x + dx, y - 1, c); r.px(x + dx, y - 2, hi); };

// ---------- هویج: برگِ پرپرِ بالا + ریشه‌ی نارنجی (رسیده ۱۴px) ----------
function carrot(r, s) {
  if (s === 0) return nub(r, E.sprout);
  if (s === 1) { r.line(8, BY, 8, BY - 2, E.leaf); r.px(7, BY - 3, E.leafHi); r.px(9, BY - 2, E.leaf); return; }
  if (s === 2) { r.line(8, BY, 8, BY - 4, E.leaf); leaf2(r, 8, BY - 4, -2, E.leaf, E.leafHi); leaf2(r, 8, BY - 3, 2, E.leaf, E.leafHi); return; }
  if (s === 3) {
    r.line(8, BY, 8, BY - 7, E.leaf);
    for (const [dx, y] of [[-3, BY - 5], [3, BY - 5], [-2, BY - 8], [2, BY - 8]]) leaf2(r, 8, y, dx, E.leafSh, E.leafHi);
    r.px(8, BY - 8, E.leafHi); return;
  }
  if (s === 4) { // ریشه از خاک بیرون زده ولی کم‌جان
    r.rect(7, BY - 2, 3, 2, E.pumpkinSh); r.px(8, BY - 2, E.carrot);
    r.line(8, BY - 3, 8, BY - 10, E.leaf);
    for (const [dx, y] of [[-3, BY - 6], [3, BY - 6], [-3, BY - 9], [3, BY - 9], [-1, BY - 11]]) leaf2(r, 8, y, dx, E.leaf, E.leafHi);
    return;
  }
  r.rect(6, BY - 5, 5, 2, E.carrot); r.rect(7, BY - 3, 3, 4, E.carrot);      // ریشه‌ی مخروطی
  r.px(7, BY - 5, E.carrotHi); r.px(8, BY - 5, E.carrotHi); r.px(7, BY - 4, E.carrotHi);
  r.px(10, BY - 5, E.pumpkinSh); r.px(10, BY - 4, E.pumpkinSh); r.px(7, BY - 3, E.pumpkinSh); r.px(9, BY - 2, E.pumpkinSh);
  r.line(8, BY - 5, 8, BY - 13, E.leaf);                                     // دمِ برگ‌ها
  for (const [dx, y] of [[-3, BY - 7], [3, BY - 7], [-3, BY - 10], [3, BY - 10], [-2, BY - 13], [2, BY - 13]]) leaf2(r, 8, y, dx, E.leaf, E.leafHi);
  for (const [dx, y] of [[-1, BY - 8], [1, BY - 11]]) leaf2(r, 8, y, dx, E.leafSh, E.leaf);
}

// ---------- گندم: بوته‌ی چندساقه با سنبله‌ی ریشک‌دار (رسیده ۱۶px) ----------
function wheat(r, s) {
  if (s === 0) return nub(r, E.sprout);
  if (s === 1) { r.line(8, BY, 8, BY - 3, E.wheatG); r.px(7, BY - 4, E.leafHi); r.px(9, BY - 2, E.leaf); return; }
  if (s === 2) {
    for (const x of [6, 8, 10]) r.line(x, BY, x, BY - 5, E.wheatG);
    r.px(5, BY - 6, E.leaf); r.px(11, BY - 6, E.leaf); r.px(8, BY - 6, E.leafHi); return;
  }
  if (s === 3) {
    for (const [x, t] of [[5, BY - 7], [8, BY - 9], [11, BY - 7]]) r.line(x, BY, x, t, E.wheatG);
    for (const x of [5, 8, 11]) { r.px(x - 1, BY - 4, E.leafSh); r.px(x + 1, BY - 5, E.leaf); }
    for (let y = BY - 9; y < BY - 6; y++) { r.px(8, y, E.wheatG); r.px(7, y, E.leaf); r.px(9, y, E.leafSh); } // سنبله‌ی سبزِ نوظهور
    return;
  }
  const EARS = s === 4 ? [[5, BY - 8], [8, BY - 10], [11, BY - 8]] : [[5, BY - 11], [8, BY - 13], [11, BY - 11]];
  for (const [x, top] of EARS) {
    r.line(x, BY, x, top + 3, E.wheatG);
    for (let y = top; y < top + 4; y++) {                                     // دانه‌های طلایی + dither
      r.px(x - 1, y, dz(x, y) ? E.wheat : E.wheatSh); r.px(x, y, E.wheat); r.px(x + 1, y, dz(x + 1, y) ? E.wheatHi : E.wheat);
    }
    r.px(x, top - 1, E.wheatHi); r.px(x, top - 2, s === 4 ? E.wheatSh : E.wheatHi); // ریشک
    r.px(x - 1, top + 4, E.wheatSh); r.px(x + 1, top + 4, E.wheatSh);
  }
  r.rect(3, BY - 3, 3, 2, E.leaf); r.px(4, BY - 3, E.leafHi);                 // برگ‌های پای بوته
  r.rect(10, BY - 3, 3, 2, E.leaf); r.px(8, BY - 3, E.leafSh);
}

// ---------- کدو: بوته‌ی برگ‌پهن + میوه‌ی بزرگِ راه‌راه (رسیده ۱۴px) ----------
function pumpkin(r, s) {
  if (s === 0) return nub(r, E.sprout);
  if (s === 1) { r.line(8, BY, 8, BY - 3, E.stem); r.rect(5, BY - 5, 3, 2, E.leafHi); r.rect(9, BY - 4, 3, 2, E.leaf); return; }
  if (s === 2) {
    for (let x = 2; x <= 13; x++) r.px(x, BY - (x < 8 ? 2 : 3), E.stem);      // پیچکِ خزنده
    r.ellipse(4, BY - 5, 2, 2, E.leaf); r.px(4, BY - 8, E.leafHi);
    r.ellipse(12, BY - 6, 2, 2, E.leafSh); r.px(12, BY - 9, E.leaf); return;
  }
  if (s === 3) {
    r.ellipse(3, BY - 6, 3, 2, E.leafSh); r.ellipse(3, BY - 6, 2, 1, E.leaf); r.px(3, BY - 8, E.leafHi);
    r.ellipse(12, BY - 7, 3, 2, E.leafSh); r.ellipse(12, BY - 7, 2, 1, E.leaf); r.px(12, BY - 9, E.leafHi);
    r.line(12, BY - 5, 9, BY - 2, E.stem);
    r.rect(6, BY - 2, 4, 3, E.stem); r.px(7, BY - 3, E.leaf); return;         // کدوی نارسِ سبز
  }
  const ripe = s === 5;
  const cc = ripe ? E.pumpkin : E.pumpkinSh, hi = ripe ? E.pumpkinHi : E.pumpkin, sh = ripe ? E.pumpkinSh : E.stem;
  if (ripe) {                                                                 // برگِ بلندِ چپ (۱۴px ارتفاع)
    r.ellipse(3, BY - 9, 3, 2, E.leafSh); r.ellipse(3, BY - 9, 2, 1, E.leaf); r.px(3, BY - 12, E.leafHi);
    r.ellipse(13, BY - 7, 3, 2, E.leafSh); r.ellipse(13, BY - 7, 2, 1, E.leaf); r.px(13, BY - 10, E.leaf);
  } else {
    r.ellipse(3, BY - 7, 3, 2, E.leafSh); r.ellipse(3, BY - 7, 2, 1, E.leaf); r.px(3, BY - 11, E.leafHi);
    r.ellipse(12, BY - 6, 2, 2, E.leaf); r.px(12, BY - 9, E.leafSh);
  }
  const x0 = ripe ? 5 : 6, w = ripe ? 7 : 5, y0 = ripe ? BY - 7 : BY - 6, h = ripe ? 8 : 6;
  r.rect(x0, y0, w, h, cc);
  if (ripe) for (const y of [y0 + 1, y0 + 4]) { r.px(x0 - 1, y, cc); r.px(x0 + w, y, cc); }   // برجستگیِ پهلو
  for (const x of [x0 + 2, x0 + w - 2]) for (let y = y0; y < y0 + h; y++) if (y > y0 + h - 3 || dz(x, y)) r.px(x, y, sh);      // راه‌راه‌ها
  for (let y = y0; y <= y0 + 2; y++) { r.px(x0, y, hi); r.px(x0 + 1, y, hi); }
  r.px(x0 + 3, y0, hi); r.px(x0 + w - 1, y0, hi); r.px(x0 + 1, y0 + 3, hi);
  r.px(x0, y0 + h - 1, sh); r.px(x0 + w - 1, y0 + h - 1, sh);
  r.rect(8, y0 - 2, 1, 2, E.stem); r.px(9, y0 - 2, E.leaf); r.px(6, y0 - 2, E.leafSh);         // دمِ چوبی
}

// ---------- توت‌فرنگی: بوته‌ی پهنِ کوتاه + توت‌های ریزِ سرخ (رسیده ۱۳px) ----------
function strawberry(r, s) {
  if (s === 0) return nub(r, E.sprout);
  if (s === 1) { r.line(8, BY, 8, BY - 3, E.leafHi); r.px(7, BY - 3, E.leaf); r.px(9, BY - 4, E.leaf); return; }
  if (s === 2) { r.ellipse(8, BY - 3, 4, 2, E.leafSh); r.ellipse(8, BY - 4, 3, 1, E.leaf); r.px(8, BY - 6, E.leafHi); return; }
  if (s === 3) {
    r.ellipse(8, BY - 4, 5, 2, E.leafSh); r.ellipse(8, BY - 5, 4, 2, E.leaf);
    r.px(4, BY - 6, E.leaf); r.px(12, BY - 6, E.leaf); r.px(8, BY - 8, E.leafHi);
    r.px(6, BY - 9, E.flowerW); r.px(10, BY - 9, E.flowerW); r.px(8, BY - 10, E.flowerY); return; // گل‌های سفید
  }
  const bw = s === 5 ? 6 : 4;
  r.ellipse(8, BY - 3, bw, 3, E.leafSh); r.ellipse(8, BY - 4, bw - 1, 2, E.leaf);     // تودهِ برگ (پایه روی ردیفِ ۲۱)
  r.px(8, BY - 8, E.leafHi); r.px(5, BY - 9, E.leafSh); r.px(11, BY - 8, E.leaf);
  if (s === 5) { r.px(6, BY - 12, E.leaf); r.px(9, BY - 12, E.leafHi); }        // نوکِ برگِ بلند ⇒ ۱۳px
  const BER = s === 5 ? [[6, BY - 4], [9, BY - 3], [12, BY - 5]] : [[6, BY - 4], [11, BY - 4]];
  for (const [x, y] of BER) {
    const fc = s === 5 ? E.straw : E.strawSh, fh = s === 5 ? E.strawHi : E.straw;
    r.rect(x, y, 3, 3, fc); r.px(x, y, fh); r.px(x + 1, y, fh); r.px(x + 2, y + 2, s === 5 ? E.strawSh : E.stem);
    r.px(x, y - 1, E.leaf); r.px(x + 1, y - 1, E.leafSh);                       // کاسبرگ
    if (s === 5) { r.px(x + 1, y + 2, E.white); r.px(x + 2, y + 1, E.white); }  // دانه‌های سفید (داخلِ توت)
  }
  r.px(13, BY - 7, E.flowerY); r.px(3, BY - 5, E.flowerW);                      // گل‌های ریزِ باقی‌مانده
}

// ---------- بادمجان: ساقه‌ی ایستاده + میوه‌ی بنفشِ آویزان (رسیده ۱۴px) ----------
function eggplant(r, s) {
  if (s === 0) return nub(r, E.sprout);
  if (s === 1) { r.line(8, BY, 8, BY - 3, E.stem); r.px(7, BY - 3, E.leaf); r.px(9, BY - 4, E.leaf); return; }
  if (s === 2) {
    r.line(8, BY, 8, BY - 6, E.stem);
    leaf2(r, 8, BY - 5, -3, E.leaf, E.leafHi); leaf2(r, 8, BY - 6, 3, E.leaf, E.leafHi); r.px(8, BY - 7, E.leafHi); return;
  }
  if (s === 3) {
    r.line(8, BY, 8, BY - 9, E.stem);
    for (const [dx, y] of [[-3, BY - 6], [3, BY - 7], [-3, BY - 9]]) leaf2(r, 8, y, dx, E.leaf, E.leafHi);
    r.rect(6, BY - 4, 3, 3, E.eggplantSh); r.px(7, BY - 5, E.stem); r.px(6, BY - 4, E.eggplant); return; // میوه‌ی نارس
  }
  r.line(8, BY, 8, BY - 12, E.stem);
  for (const [dx, y] of [[-3, BY - 6], [3, BY - 6], [-3, BY - 9], [3, BY - 10], [-2, BY - 12]]) leaf2(r, 8, y, dx, E.leaf, E.leafHi);
  r.px(8, BY - 13, E.leafHi);
  const FR = s === 5 ? [[4, BY - 6], [11, BY - 4]] : [[4, BY - 5]];
  for (const [x, y] of FR) {
    const c = s === 5 ? E.eggplant : E.eggplantSh, hi = s === 5 ? E.eggplantHi : E.eggplant;
    r.rect(x, y, 3, 5, c); r.px(x, y, hi); r.px(x + 1, y, hi); r.px(x + 2, y + 4, E.eggplantSh);
    r.rect(x, y - 1, 3, 1, E.leaf); r.px(x + 1, y - 1, E.leafHi);             // کلاهک سبز
    r.px(x + 1, y + 2, E.white);
  }
}

// ---------- ذرت: بلندترین (رسیده ۲۰px) با بلال و کاکل ----------
function corn(r, s) {
  if (s === 0) return nub(r, E.sprout);
  if (s === 1) { r.line(8, BY, 8, BY - 4, E.wheatG); r.px(7, BY - 4, E.leaf); r.px(9, BY - 5, E.leafHi); return; }
  if (s === 2) {
    for (const x of [6, 8, 10]) r.line(x, BY, x, BY - 7, E.wheatG);
    for (const x of [6, 10]) { r.px(x - 1, BY - 5, E.leaf); r.px(x + 1, BY - 4, E.leafSh); }
    r.px(8, BY - 8, E.leafHi); return;
  }
  if (s === 3) {
    r.line(8, BY, 8, BY - 10, E.wheatG);
    for (const [dx, y] of [[-4, BY - 5], [4, BY - 6], [-4, BY - 9]]) leaf2(r, 8, y, dx, E.leaf, E.leafHi);
    r.px(8, BY - 11, E.leafHi); r.px(7, BY - 8, E.leafSh); r.px(9, BY - 7, E.leafSh); return;
  }
  const top = s === 5 ? BY - 16 : BY - 13;
  r.line(8, BY, 8, top, E.wheatG);                                            // ساقه
  for (const [dx, y] of [[-5, BY - 4], [5, BY - 7], [-4, BY - 10], [4, BY - 13], [-3, top + 1]]) leaf2(r, 8, y, dx, E.leaf, E.leafHi);
  r.px(8, top - 1, E.leafHi);
  if (s === 5) { r.rect(7, top - 2, 3, 2, E.wheat); r.px(8, top - 3, E.wheatHi); r.px(6, top - 3, E.wheatSh); r.px(10, top - 3, E.wheatSh); } // کاکل
  else { r.px(7, top - 2, E.wheatSh); r.px(9, top - 2, E.wheatSh); }
  const COBS = s === 5 ? [[4, BY - 10], [10, BY - 13]] : [[6, BY - 8]];
  for (const [x, y] of COBS) {
    const c = s === 5 ? E.corn : E.cornSh;
    r.rect(x, y, 3, 6, c); r.rect(x + 1, y, 1, 6, s === 5 ? E.cornHi : E.corn);
    r.px(x + 2, y + 1, E.cornSh); r.px(x + 2, y + 4, E.cornSh);
    r.px(x, y + 2, E.white); r.px(x + 1, y + 3, E.white); r.px(x, y + 5, E.white);
  }
}

// ---------- سیب (فقط آیکونِ وعده — محصولِ زمین نیست) ----------
function apple(r) {
  r.rect(5, BY - 8, 7, 7, E.straw); r.rect(6, BY - 10, 5, 8, E.straw);
  r.px(5, BY - 7, E.strawSh); r.px(5, BY - 5, E.strawSh); r.px(10, BY - 4, E.strawSh);
  r.px(6, BY - 9, E.strawHi); r.px(7, BY - 9, E.strawHi); r.px(6, BY - 6, E.strawHi);
  r.rect(8, BY - 12, 1, 2, E.stem); r.rect(9, BY - 12, 2, 1, E.leaf); r.px(10, BY - 13, E.leafHi);
}

const SHAPES = { carrot, wheat, pumpkin, strawberry, eggplant, corn, apple };

// ---------- API ----------
export function cropSprite(type, stage) {
  const st = stage < 0 ? 0 : stage > 5 ? 5 : stage | 0;
  const key = type + st;
  let s = _c.get(key);
  if (s) return s;
  s = new Raster(CW, CH);
  (SHAPES[type] || carrot)(s, st);
  s.markOpaque();
  _c.set(key, s);
  return s;
}

// آیکونِ ۱۶×۱۶ برای UI (گامِ رسیده، لنگرِ پایین، بی‌تغییرِ مقیاس) — جاگزینِ cropSprite(t,3) در ui.js
export function cropIcon(type) {
  let s = _i.get(type);
  if (s) return s;
  s = new Raster(TILE, TILE);
  const src = cropSprite(type, CROP_STAGES - 1);
  let x0 = CW, x1 = -1, y0 = CH, y1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (src.d[(y * CW + x) * 4 + 3] !== 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return s;
  const w = Math.min(TILE, x1 - x0 + 1), h = Math.min(TILE, y1 - y0 + 1);
  src.blit(s, x0 + ((x1 - x0 + 1 - w) >> 1), y1 - h + 1, w, h, (TILE - w) >> 1, TILE - h);
  s.markOpaque();
  _i.set(type, s);
  return s;
}
