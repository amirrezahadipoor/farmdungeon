// farm_terrain.js — کش لایه‌ی استاتیک زمین مزرعه + dirty-tile (S2.1)
// کش = **دقیقاً** همان ترتیبِ قدیمیِ رسم تایل‌های استاتیک (پایه + لبه‌ی راه + کرانه‌ی آب + بوته)
// ⇒ خروجی هر فریم با قبل بایت‌به‌بایت یکسان می‌ماند؛ فقط هزینه‌ی هر فریم حذف می‌شود.
// پویاها (آب متحرک، محصول، درخشش، دکور زنده) در farm_render روی کش کشیده می‌شوند.
import { Raster } from './raster.js';
import { groundSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { drawPathEdge } from './art/farm_decor.js';
import { mask4 } from './art/autotile.js'; // S2.6: لبهٔ خاک/گزارهٔ خیس-خشک از همسایه‌ها
import { fbm, hash2, vnoise } from './art/noise.js';
import { bayer4 } from './art/dither.js';
import { rp } from './art/ramps.js';
import { drawWater, SHORE_FARM } from './art/water.js'; // S2.7: آب و کرانه — یک منبع
import { bakeDecals, drawForest } from './art/decal.js'; // S2.9: دکال‌های خوشه‌ای + نوارِ جنگلِ لبه (هر دو پخته‌شده)

let cache = null;      // Raster کل دنیا (۴۸۰×۳۲۰)
let bound = null;      // فارمِ متصل به کش (هر Game کش خودش را دارد)
const dirty = new Set();
const changed = new Set(); // بازاستفاده در هر فریم (بدون تخصیص در مسیر داغ)
const W = WORLD_W; // عرضِ کش به پیکسل
const MACRO_F = 0.025;   // ≈ ۱/۴۰px — فرکانسِ نویزِ ماکرو (لکه‌های روشن/تیره)
const GRASS_TINT = new Map(); // رنگِ پله‌ی چمن → اندیسِ پله (برای جابه‌جاییِ ماکرو)
for (let i = 0; i < 7; i++) { const c = rp('grass', i); GRASS_TINT.set((c[0] << 16) | (c[1] << 8) | c[2], i); }
const KIND = { grass: 1, path: 2, tree: 3, soil: 4, water: 5, hedge: 6, gate: 7, sign: 8, house: 9, scarecrow: 10, fence: 11 };
let sigs = null;       // امضای استاتیک هر سلول (تورِ اطمینان: هر جهشِ بی‌هوک را هم می‌گیرد)
export const OPAQUE = new Uint8Array(COLS * ROWS); // آیا همه‌ی پیکسل‌های تایلِ کش مات‌اند؟ (⇒ blit فوق‌سریع)

// بافتِ ماکرو (S2.4): جهت و چگالیِ «تافت»های چمن از fbmِ جهانی (≈۱/۴۰px).
// چگالی در مرزِ لکه‌ها → صفر، پس هیچ بلوک/شطرنجِ تایلی دیده نمی‌شود و تایل همیشه فقط ۲ تُنِ **مجاور** دارد (ΔL≈۱۴).
function tuftBake(r, sx, sy, tx, ty) {
  const m = fbm((tx * TILE + 8) * MACRO_F, (ty * TILE + 8) * MACRO_F, 51, 2) - 0.5; // −۰٫۵..۰٫۵
  const p = 0.14 + Math.min(0.58, Math.abs(m) * 1.7); // احتمالِ نگه‌داشتنِ تافت: کفِ ۰٫۱۴ (تا تایلِ تختِ یکسانِ همسایه پیش نیاید ⇒ M7)
  const upC = rp('grass', 5), dnC = rp('grass', 3), baseC = rp('grass', 4);
  const d = r.d;
  for (let y = 0; y < TILE; y++) {
    const gy = ty * TILE + y;
    let i = ((sy + y) * r.w + sx) * 4;
    for (let x = 0; x < TILE; x++, i += 4) {
      const idx = GRASS_TINT.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (idx !== 3 && idx !== 5) continue;        // فقط پیکسل‌های تافتِ اسپرایت
      const gx = tx * TILE + x;
      const keep = (vnoise(gx * 0.3, gy * 0.3, 62) * 0.6 + bayer4(gx, gy) * 0.4) < p; // خوشه‌های ۲–۳px + مرزِ dither
      const nc = keep ? (m > 0 ? upC : dnC) : baseC;
      d[i] = nc[0]; d[i + 1] = nc[1]; d[i + 2] = nc[2];
    }
  }
}
// S2.5: راهِ هم‌جنس (خاک‌راه/دروازه/خانه) — مبنای واریانتِ راه و حاشیه‌ی چمنِ drawPathEdge
const isRoad = (c) => !!c && (c.kind === 'path' || c.kind === 'gate' || c.kind === 'house');
const pathVar = (f, tx, ty) => // بیت۰: راهِ افقی (E/W) · بیت۱: راهِ عمودی (N/S) ⇒ ۴ واریانت
  ((isRoad(f.cell(tx - 1, ty)) || isRoad(f.cell(tx + 1, ty))) ? 1 : 0) |
  ((isRoad(f.cell(tx, ty - 1)) || isRoad(f.cell(tx, ty + 1))) ? 2 : 0);
// S2.6: خاک — **لبهٔ بیرونی** (خاک↔غیرخاک) = حاشیهٔ چمنِ ۲–۳px با تُنِ میدانِ جهانیِ تافت ⇒ هم‌بافت با چمنِ همسایه
// (وگرنه شیارِ L25 و لبهٔ L39 مقابل چمن = جهشِ >۱۵ در >۲۵٪ ردیف‌ها ⇒ M8 می‌شکند)؛ داخلِ آن ۱px کلوخهٔ روشن (بالا/چپ)
// یا سایهٔ تیره (پایین/راست). لبهٔ **داخلی** (خاک↔خاک) باز می‌ماند ⇒ شیارها بین تایل‌ها پیوسته می‌مانند.
function soilBake(r, f, tx, ty, sx, sy) {
  const isS = (c) => !!c && c.kind === 'soil';
  const wet = !!f.cell(tx, ty).wet, m = mask4((x, y) => isS(f.cell(x, y)), tx, ty);
  const hi = wet ? E.soilWetHi : E.soilHi, sh = wet ? E.soilWetSh : E.soilSh;
  const gx0 = tx * TILE, gy0 = ty * TILE;
  const gA = rp('grass', 4), gB = rp('grass', 3), gC = rp('grass', 5);
  const gTone = (gx, gy) => { const n = vnoise(gx * 0.3, gy * 0.3, 62) * 0.6 + bayer4(gx, gy) * 0.4; return n < 0.30 ? gB : (n < 0.64 ? gA : gC); };
  for (const [bit, dx, dy, horiz, fromStart] of [[1, 0, -1, true, true], [2, 1, 0, false, false], [4, 0, 1, true, false], [8, -1, 0, false, true]]) {
    if (m & bit) continue;                                   // لبهٔ داخلی (خاک↔خاک): باز
    const clod = bit === 1 || bit === 8;                     // بالا/چپ = کلوخهٔ روشن · پایین/راست = سایه
    for (let i = 0; i < TILE; i++) {
      const h = hash2(bit * 31 + 5, horiz ? gx0 + i : gy0 + i, 81);
      const w = 2 + (h > 0.62 ? 1 : 0);                      // حاشیه: ۲–۳px (هم‌سبک با لبهٔ راه)
      for (let dd = 0; dd < w; dd++) {
        const x = horiz ? i : (fromStart ? dd : TILE - 1 - dd), y = horiz ? (fromStart ? dd : TILE - 1 - dd) : i;
        r.px(sx + x, sy + y, gTone(gx0 + x, gy0 + y));
      }
      const bx = horiz ? i : (fromStart ? w : TILE - 1 - w), by = horiz ? (fromStart ? w : TILE - 1 - w) : i;
      r.px(sx + bx, sy + by, clod ? hi : sh);
    }
  }
  // گذارِ خیس↔خشک: نوارِ ۳px؛ هر دو سو یک قاعدهٔ dither ⇒ نیمهٔ مرز مکمل و بی‌درز (bayer با مختصاتِ جهانی)
  const dryB = E.soil, wetB = E.soilWet, d = r.d;
  const dk = (dryB[0] << 16) | (dryB[1] << 8) | dryB[2], wk = (wetB[0] << 16) | (wetB[1] << 8) | wetB[2];
  for (const [bit, dx, dy, horiz, fromStart] of [[1, 0, -1, true, true], [2, 1, 0, false, false], [4, 0, 1, true, false], [8, -1, 0, false, true]]) {
    if (m & bit) { const nb = f.cell(tx + dx, ty + dy); if (!isS(nb) || !!nb.wet === wet) continue; }
    else continue;                                           // مرز با غیرخاک: حاشیهٔ چمن کار را کرده
    for (let i = 0; i < TILE; i++) for (let dd = 0; dd < 3; dd++) {
      const x = horiz ? i : (fromStart ? dd : TILE - 1 - dd), y = horiz ? (fromStart ? dd : TILE - 1 - dd) : i;
      const i4 = ((sy + y) * r.w + sx + x) * 4, key = (d[i4] << 16) | (d[i4 + 1] << 8) | d[i4 + 2];
      if (key !== dk && key !== wk) continue;                // شیار/دانه/کلوخه دست‌نخورده
      const t = (wet ? dd + 1 : 3 - dd) / 4;                 // احتمالِ ماندنِ «خیس» در عمقِ dd
      const nc = bayer4(tx * TILE + x, ty * TILE + y) < t ? wetB : dryB;
      d[i4] = nc[0]; d[i4 + 1] = nc[1]; d[i4 + 2] = nc[2];
    }
  }
}
// ترتیب رسمِ قدیمیِ یک تایل استاتیک — عیناً از farm_render منتقل شد
// S2.8: شکلِ حصار/پرچین از mask4 (همسایهٔ هم‌جنس) + واریانتِ چوب/برگ از هشِ per-تایل
// ⇒ ریل/تیرک فقط آن‌جایی که همسایه هست کشیده می‌شود و بافت هر ۱۶px تکرار نمی‌شود
const fenceVar = (f, tx, ty) =>
  mask4((x, y) => { const c = f.cell(x, y); return !!c && c.kind === 'fence'; }, tx, ty) |
  ((((hash2(tx, ty, 34) * 3) | 0) & 3) << 4);
const hedgeVar = (f, tx, ty) =>
  mask4((x, y) => { const c = f.cell(x, y); return !!c && c.kind === 'hedge'; }, tx, ty) |
  ((((hash2(tx, ty, 33) * 4) | 0) & 3) << 4);
// S2.8: سایهٔ تماس روی چمن (۲px، SE) — هنگامِ پختِ تایلِ چمن از همسایهٔ N/W خوانده می‌شود
// (بوته روی تایلِ چمنی است ⇒ همان شرطِ کشیدنِ بوته در bakeTile این‌جا «سازه» حساب می‌شود)
const hasBush = (f, tx, ty) => {
  const c = f.cell(tx, ty);
  if (!c || c.kind !== 'grass' || c.farmable || !f.insideFence(tx, ty)) return false;
  const b = f.cell(tx, ty + 1);
  return !!b && b.farmable && b.kind === 'grass';
};
const isStruct = (f, tx, ty) => {
  const c = f.cell(tx, ty);
  return !!c && (c.kind === 'fence' || c.kind === 'hedge' || hasBush(f, tx, ty));
};
function structShadow(r, f, tx, ty, sx, sy) {
  const sh = rp('grass', 3); // یک پله تیره‌تر از چمنِ پایه (L۵۲ در برابر L۶۶ ⇒ ΔL ۱۴)
  if (isStruct(f, tx, ty - 1)) { r.rect(sx, sy, TILE, 1, sh); r.rect(sx + 1, sy + 1, TILE - 1, 1, sh); }
  if (isStruct(f, tx - 1, ty)) { r.rect(sx, sy, 1, TILE, sh); r.rect(sx + 1, sy + 1, 1, TILE - 1, sh); }
}

function bakeTile(f, tx, ty, r, wf = 0) {
  const c = f.cell(tx, ty); if (!c) return;
  const sx = tx * TILE, sy = ty * TILE;
  let base;
  if (c.kind === 'grass') base = groundSprite('grass', (hash2(tx, ty, 31) * 8) | 0); // S2.4: واریانت از hashِ مختصات
  else if (c.kind === 'path') base = groundSprite('path', pathVar(f, tx, ty)); // S2.5: واریانتِ جهت‌دار
  else if (c.kind === 'tree') base = groundSprite('grass', (hash2(tx, ty, 32) * 8) | 0);
  else if (c.kind === 'soil') base = groundSprite('soil', (hash2(tx, ty, 24) * 8) | 0, c.wet); // S2.6: دانه‌بندیِ per-تایل
  else if (c.kind === 'water') base = null; // S2.7: تایلِ آب کامل در bakeWater (بدنه+کاستیک+ساحل+کف)
  else if (c.kind === 'hedge') base = groundSprite('hedge', hedgeVar(f, tx, ty)); // S2.8: ۱۶ شکلِ mask4
  else if (c.kind === 'gate') base = groundSprite(c.gL ? 'gateL' : 'gateR', ty === f.gate.y ? 0 : 1);
  else if (c.kind === 'sign') base = groundSprite('grass', 0);
  else if (c.kind === 'house') base = groundSprite('grass', 0);
  else if (c.kind === 'scarecrow') base = groundSprite('grass', 0);
  else if (c.kind === 'fence') { // S2.8: چمنِ زیر + ریل/تیرکِ mask4 (ریل فقط به سمتِ همسایهٔ حصار می‌رود)
    groundSprite('grass', (tx * 5 + ty * 3) & 3).over(r, sx, sy);
    base = groundSprite('fence', fenceVar(f, tx, ty));
  }
  else { groundSprite('grass', (tx * 5 + ty * 3) & 3).over(r, sx, sy); base = null; }
  if (base) base.over(r, sx, sy);
  if (c.kind === 'hedge') drawForest(r, sx, sy, tx, ty); // S2.9: نوارِ جنگلِ لبه‌ی نقشه (تاج‌های پخته‌شده)
  // S2.4: تُنِ ماکرو روی زمینِ چمنی (سازه‌ها هم چون پایه‌شان چمن است یکدست می‌مانند)
  if (c.kind === 'grass' || c.kind === 'tree' || c.kind === 'sign' || c.kind === 'house' || c.kind === 'scarecrow') tuftBake(r, sx, sy, tx, ty);
  if (c.kind === 'grass') structShadow(r, f, tx, ty, sx, sy); // S2.8: سایهٔ تماسِ حصار/پرچین/بوته (SE)
  if (c.kind === 'grass') bakeDecals(r, f, tx, ty, sx, sy); // S2.9: دکال‌های خوشه‌ای (فقط چمنِ بیرونِ حصار)
  if (c.kind === 'path') drawPathEdge(r, sx, sy, tx, ty, f);
  if (c.kind === 'soil') soilBake(r, f, tx, ty, sx, sy); // S2.6
  if (c.kind === 'water') bakeWater(r, f, tx, ty, sx, sy, wf);
  // بوته‌ی مرز روی زمین قفل‌شده (تایل زیرین آزاد است)
  if (c.kind === 'grass' && !c.farmable && f.insideFence(tx, ty)) {
    const below = f.cell(tx, ty + 1);
    if (below && below.farmable && below.kind === 'grass') groundSprite('bush').over(r, sx, sy);
  }
}

// آب (S2.7): بدنه بر اساسِ عمق + کاستیکِ ۴ فریم + ساحلِ mask4 + کفِ موج — همه در art/water.js (یک منبع با دانجن)
let _bf = null;
const _bcell = (x, y) => _bf.cell(x, y);
export function bakeWater(r, f, tx, ty, sx, sy, wf) {
  _bf = f;
  drawWater(r, sx, sy, _bcell, tx, ty, wf, SHORE_FARM);
}

// امضای ورودی‌های استاتیک یک سلول (kind/variant/wet/fenceH/gL/farmable + ردیف دروازه)
function sig(f, c, ty) {
  return (KIND[c.kind] || 0) | (c.variant << 5) | (c.wet ? 1024 : 0) | (c.fenceH ? 2048 : 0) |
    (c.gL ? 4096 : 0) | (c.farmable ? 8192 : 0) | (f.gate && f.gate.y === ty ? 16384 : 0);
}
function collect(f, out) { // dirty بر اساس تفاوت امضا (تور اطمینان)
  let n = 0;
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const i = ty * COLS + tx, s = sig(f, f.grid[i], ty);
    if (sigs[i] !== s) { sigs[i] = s; out.add(i); n++; }
  }
  return n;
}
function rebake(f, list) { // پاک‌کردن جعبه‌ی تایل‌ها سپس پخت به ترتیب ردیفی (همان ترتیب قدیم)
  const seen = new Set();
  for (const i of list) {
    const tx = i % COLS, ty = (i / COLS) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { // +۸ همسایه (آماده‌ی autotile S2.2)
      const x = tx + dx, y = ty + dy;
      if (x >= 0 && y >= 0 && x < COLS && y < ROWS) seen.add(y * COLS + x);
    }
  }
  const arr = [...seen].sort((a, b) => a - b);
  for (const i of arr) cache.rect((i % COLS) * TILE, ((i / COLS) | 0) * TILE, TILE, TILE, [0, 0, 0, 0]);
  for (const i of arr) bakeTile(f, i % COLS, (i / COLS) | 0, cache);
  const u = cache.u32();
  for (const i of arr) { // پرچم مات‌بودن: اگر همه‌ی ۲۵۶ پیکسل α=255 دارند، blit با کپیِ u32
    const tx = i % COLS, ty = (i / COLS) | 0; let m = 1;
    for (let y = 0; y < TILE && m; y++) { let j = (ty * TILE + y) * W + tx * TILE; // ایندکس u32 = عرضِ پیکسلیِ کش
      for (let x = 0; x < TILE; x++, j++) if ((u[j] >>> 24) !== 255) { m = 0; break; }
    }
    OPAQUE[i] = m;
  }
  engineCalls += arr.length;
}
let engineCalls = 0; // شمارش پخت‌ها (تست)
function build(f) {
  cache = new Raster(WORLD_W, WORLD_H);
  sigs = new Int32Array(COLS * ROWS).fill(-1);
  bound = f; dirty.clear(); engineCalls = 0;
  f.onCell = (tx, ty) => markDirty(tx, ty); // هوک مدل→نما (فارم تغییر سلول را اعلام می‌کند)
  f.onAll = () => { for (let i = 0; i < sigs.length; i++) sigs[i] = -1; };
  const all = new Set(); for (let i = 0; i < COLS * ROWS; i++) all.add(i);
  rebake(f, all);
  return cache;
}
export function markDirty(tx, ty) {
  if (!cache || tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
  dirty.add(ty * COLS + tx);
}
export function markAll() { if (sigs) sigs.fill(-1); }
export function flushDirty(f) {
  if (f !== bound) return build(f);
  if (dirty.size) { for (const i of dirty) sigs[i] = -1; dirty.clear(); }
  changed.clear();
  const n = collect(f, changed); // تفاوت امضا = سلول‌های عوض‌شده
  if (n) rebake(f, changed);
  return cache;
}
export const terrainStats = () => ({ baked: engineCalls, size: cache ? [cache.w, cache.h] : null });
