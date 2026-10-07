// farm_terrain.js — کش لایه‌ی استاتیک زمین مزرعه + dirty-tile (S2.1)
// کش = **دقیقاً** همان ترتیبِ قدیمیِ رسم تایل‌های استاتیک (پایه + لبه‌ی راه + کرانه‌ی آب + بوته)
// ⇒ خروجی هر فریم با قبل بایت‌به‌بایت یکسان می‌ماند؛ فقط هزینه‌ی هر فریم حذف می‌شود.
// پویاها (آب متحرک، محصول، درخشش، دکور زنده) در farm_render روی کش کشیده می‌شوند.
import { Raster } from './raster.js';
import { groundSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { drawPathEdge } from './art/farm_decor.js';
import { fbm, hash2, vnoise } from './art/noise.js';
import { bayer4 } from './art/dither.js';
import { rp } from './art/ramps.js';

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
// ترتیب رسمِ قدیمیِ یک تایل استاتیک — عیناً از farm_render منتقل شد
function bakeTile(f, tx, ty, r, wf = 0) {
  const c = f.cell(tx, ty); if (!c) return;
  const sx = tx * TILE, sy = ty * TILE;
  let base;
  if (c.kind === 'grass') base = groundSprite('grass', (hash2(tx, ty, 31) * 8) | 0); // S2.4: واریانت از hashِ مختصات
  else if (c.kind === 'path') base = groundSprite('path', pathVar(f, tx, ty)); // S2.5: واریانتِ جهت‌دار
  else if (c.kind === 'tree') base = groundSprite('grass', (hash2(tx, ty, 32) * 8) | 0);
  else if (c.kind === 'soil') base = groundSprite('soil', 0, c.wet);
  else if (c.kind === 'water') base = groundSprite('water', (tx * 5 + ty * 3) & 3, false, wf);
  else if (c.kind === 'hedge') base = groundSprite('hedge');
  else if (c.kind === 'gate') base = groundSprite(c.gL ? 'gateL' : 'gateR', ty === f.gate.y ? 0 : 1);
  else if (c.kind === 'sign') base = groundSprite('grass', 0);
  else if (c.kind === 'house') base = groundSprite('grass', 0);
  else if (c.kind === 'scarecrow') base = groundSprite('grass', 0);
  else { groundSprite('grass', (tx * 5 + ty * 3) & 3).over(r, sx, sy); base = groundSprite(c.fenceH ? 'fence' : 'fencePost'); }
  base.over(r, sx, sy);
  // S2.4: تُنِ ماکرو روی زمینِ چمنی (سازه‌ها هم چون پایه‌شان چمن است یکدست می‌مانند)
  if (c.kind === 'grass' || c.kind === 'tree' || c.kind === 'sign' || c.kind === 'house' || c.kind === 'scarecrow') tuftBake(r, sx, sy, tx, ty);
  if (c.kind === 'path') drawPathEdge(r, sx, sy, tx, ty, f);
  if (c.kind === 'water') bakeWater(r, f, tx, ty, sx, sy, wf);
  // بوته‌ی مرز روی زمین قفل‌شده (تایل زیرین آزاد است)
  if (c.kind === 'grass' && !c.farmable && f.insideFence(tx, ty)) {
    const below = f.cell(tx, ty + 1);
    if (below && below.farmable && below.kind === 'grass') groundSprite('bush').over(r, sx, sy);
  }
}

// آب: تایل متحرک + کرانه‌ها (کرانه فقط روی مرز) — هم در پخت کش و هم هر فریم استفاده می‌شود
export function bakeWater(r, f, tx, ty, sx, sy, wf) {
  groundSprite('water', (tx * 5 + ty * 3) & 3, false, wf).over(r, sx, sy);
  if (!f.cell(tx, ty - 1) || f.cell(tx, ty - 1).kind !== 'water') r.rect(sx, sy, 16, 1, E.waterSh);
  if (!f.cell(tx, ty + 1) || f.cell(tx, ty + 1).kind !== 'water') { r.rect(sx, sy + 14, 16, 1, E.waterSh); r.rect(sx, sy + 15, 16, 1, E.waterSh); }
  if (!f.cell(tx - 1, ty) || f.cell(tx - 1, ty).kind !== 'water') r.rect(sx, sy, 1, 16, E.waterSh);
  if (!f.cell(tx + 1, ty) || f.cell(tx + 1, ty).kind !== 'water') r.rect(sx + 15, sy, 1, 16, E.waterSh);
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
