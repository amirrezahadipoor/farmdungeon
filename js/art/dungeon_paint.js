// art/dungeon_paint.js — پختِ کفِ طبقه‌ی بزرگ به سبکِ «سه‌رخِ بالا» (ن۱۳۹، تأییدشده در نمونه‌ی dg3):
// پوچیِ تیره بیرونِ اتاق‌ها · کلاهکِ ضخیمِ دیوار با لبه‌ی روشن · نمای آجریِ رو به دوربین بالای هر کف · سنگ‌فرشِ ۲×۲ · سایه‌ی تماس.
// تکه‌پذیر: paintRows(cache, D, y0, y1) — ردیف‌ها مستقل‌اند (هر ردیف فقط به همسایه‌ها نگاه می‌کند).
import { TILE } from './palette_env.js';
import { Raster } from '../raster.js';

const C = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
// هر تم: void, cap, capHi, capSh, out, brick, brickHi, brickSh, mortar, floor×3, fMortar, fShadow, accent(دکور)
const TH = [
  ['#16131e', '#76727e', '#9a96a0', '#56525f', '#262130', '#4f4b5a', '#625e6c', '#3b3746', '#2f2b39', '#45414f', '#413d4a', '#4a4654', '#34303d', '#2c2836', '#8a8692'], // سنگ
  ['#121a16', '#6d7a66', '#8f9c84', '#4f5b4b', '#1f2a22', '#46523f', '#58654d', '#343f30', '#28321f', '#3d4838', '#394434', '#434e3d', '#2e3829', '#262f22', '#6fa04a'], // خزه
  ['#1c1110', '#7a6660', '#9c847a', '#5a4642', '#2e1a18', '#56403a', '#6b4e44', '#3f2c28', '#2e1e1c', '#4a3834', '#45332f', '#503c37', '#36261f', '#2c1e1a', '#e0733a'], // گدازه
  ['#121822', '#8a9aac', '#b4c4d4', '#64748a', '#22303e', '#5a6a80', '#70829a', '#46546a', '#34404f', '#4f5e72', '#4a596c', '#56667a', '#3a4658', '#303a4a', '#bfe6ff'], // یخ
  ['#121612', '#68705a', '#868e74', '#4a5240', '#1e241a', '#464d3a', '#565e48', '#343a2a', '#282d20', '#3c4232', '#383e2e', '#424836', '#2c3124', '#242a1e', '#8aa04e'], // باتلاق
  ['#17130f', '#7a6e5e', '#9c8e78', '#5a5042', '#2a2219', '#54493a', '#675a46', '#3e352a', '#2e271e', '#4a4134', '#463d30', '#504638', '#362f25', '#2c261e', '#d8b060'], // معدن
].map((t) => t.map(C));
export const voidCol = (theme) => TH[theme % 6][0];

const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const isFloorK = (k) => k === 'dfloor' || k === 'stairs' || k === 'decor' || k === 'water' || k === 'pillar';

export function newCache(D) { const r = new Raster(D.cols * TILE, D.rows * TILE); const v = voidCol(D.theme | 0); for (let i = 0; i < r.d.length; i += 4) { r.d[i] = v[0]; r.d[i + 1] = v[1]; r.d[i + 2] = v[2]; r.d[i + 3] = 255; } return r; }

export function paintRows(r, D, y0, y1) {
  const P = TH[(D.theme | 0) % 6], [, CAP, CAPHI, CAPSH, OUT, BR, BRHI, BRSH, MOR, F1, F2, F3, FMOR, FSH, ACC] = P, FL = [F1, F2, F3];
  const W = D.cols, H = D.rows;
  if (!D._dressMap) { D._dressMap = new Map(); for (const d of D.dress || []) D._dressMap.set(d.y * W + d.x, d); }
  const DM = D._dressMap;
  const fl = (x, y) => { const c = D.cell(x, y); return !!c && isFloorK(c.kind); };
  const near = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (fl(x + i, y + j)) return true; return false; };
  const face = (x, y) => !fl(x, y) && fl(x, y + 1);
  const isW = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !fl(x, y) && (near(x, y) || face(x, y + 1));
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const ox = x * TILE, oy = y * TILE, c = D.cell(x, y);
    if (fl(x, y)) {
      r.rect(ox, oy, TILE, TILE, FL[Math.floor(hash(x >> 1, y >> 1) * 3)]);
      if (x % 2 === 0) r.rect(ox, oy, 1, TILE, FMOR); if (y % 2 === 0) r.rect(ox, oy, TILE, 1, FMOR);
      if (hash(x, y, 3) < 0.1) { let cx = ox + 3 + Math.floor(hash(x, y, 4) * 8), cy = oy + 3; for (let k = 0; k < 8; k++) { r.rect(cx, cy, 1, 1, FMOR); cx += hash(x, y, k) < 0.5 ? 1 : 0; cy++; } }
      if (!fl(x, y - 1)) r.rect(ox, oy, TILE, 3, FSH); if (!fl(x - 1, y)) r.rect(ox, oy, 2, TILE, FSH);
      const dd = DM.get(y * W + x);
      if (dd && dd.t === 'cp') { const n = dd.n || 2; if (dd.q === n * n - 1) { if (n === 2) paintCentre(r, ox - TILE, oy - TILE, dd.v, P); else paintCentreBig(r, ox - 2 * TILE, oy - 2 * TILE, dd.v, P); } continue; }
      if (dd) paintDress(r, ox, oy, dd, P, x, y, DM, W);
      if (c.kind === 'decor') paintDecor(r, ox, oy, c.v | 0, ACC, FMOR, CAPHI, x, y);
      else if (c.kind === 'stairs') for (let i = 0; i < 4; i++) { r.rect(ox + 1, oy + 1 + i * 4, TILE - 2, 4, [CAPHI, CAP, CAPSH, OUT][i]); r.rect(ox + 1, oy + 1 + i * 4, TILE - 2, 1, i ? CAPSH : CAPHI); }
      else if (c.kind === 'pillar') { r.ellipse(ox + 8, oy + 13, 7, 3, FSH); r.rect(ox + 3, oy + 2, 10, 12, BR); r.rect(ox + 3, oy + 2, 2, 12, BRHI); r.rect(ox + 11, oy + 2, 2, 12, BRSH); r.rect(ox + 3, oy + 7, 10, 1, MOR); }
    } else if (isW(x, y)) {
      if (face(x, y)) {
        r.rect(ox, oy, TILE, TILE, BR);
        for (let row = 0; row < 4; row++) { const by = oy + row * 4, off = (row % 2) * 4; r.rect(ox, by, TILE, 1, MOR);
          for (let bx = -off; bx < TILE; bx += 8) { if (bx >= 0) r.rect(ox + bx, by, 1, 4, MOR); const s = hash(x * 4 + ((bx + 8) >> 3), y * 4 + row, 7), x0 = Math.max(0, bx + 1), w = Math.min(7, TILE - x0);
            if (s < 0.25) r.rect(ox + x0, by + 1, w, 1, BRHI); else if (s > 0.8) r.rect(ox + x0, by + 3, w, 1, BRSH); } }
        r.rect(ox, oy + TILE - 1, TILE, 1, BRSH);
        if (c && c.v === 3 && hash(x, y, 11) < 0.7) for (let i = 0; i < 5; i++) r.rect(ox + Math.floor(hash(x, y, 20 + i) * 14), oy + 8 + Math.floor(hash(x, y, 30 + i) * 7), 2, 1, ACC); // خزه/رگه
        if (c && c.v === 2) r.rect(ox + 4 + Math.floor(hash(x, y, 12) * 6), oy + 5, 4, 3, MOR); // آجرِ افتاده
        { const dd = DM.get(y * W + x); if (dd && dd.t === 'banner') paintBanner(r, ox, oy, dd.v, D.theme | 0); }
      } else {
        r.rect(ox, oy, TILE, TILE, CAP);
        if (hash(x, y, 9) < 0.3) r.rect(ox + 4 + Math.floor(hash(x, y, 2) * 6), oy + 5, 3, 1, CAPSH);
        if (!isW(x, y - 1)) r.rect(ox, oy, TILE, 2, OUT);
        if (!isW(x - 1, y) && !fl(x - 1, y)) r.rect(ox, oy, 2, TILE, OUT);
        if (!isW(x + 1, y) && !fl(x + 1, y)) r.rect(ox + TILE - 2, oy, 2, TILE, OUT);
        if (!isW(x, y + 1) && !fl(x, y + 1)) r.rect(ox, oy + TILE - 2, TILE, 2, OUT);
        if (face(x, y + 1) || fl(x, y + 1)) r.rect(ox, oy + TILE - 2, TILE, 2, CAPHI);
        if (fl(x - 1, y)) r.rect(ox, oy, 2, TILE, CAPHI); if (fl(x + 1, y)) r.rect(ox + TILE - 2, oy, 2, TILE, CAPSH); if (fl(x, y - 1)) r.rect(ox, oy, TILE, 2, CAPSH);
      }
    }
  }
}

function paintDecor(r, ox, oy, v, ACC, DK, HI, x, y) {
  const j = Math.floor(hash(x, y, 5) * 6);
  if (v <= 2) { r.rect(ox + 3 + j, oy + 9, 6, 1, HI); r.rect(ox + 2 + j, oy + 8, 2, 3, HI); r.rect(ox + 8 + j, oy + 8, 2, 3, HI); } // استخوان
  else if (v <= 4) { r.rect(ox + 5 + j, oy + 7, 4, 2, ACC); r.rect(ox + 6 + j, oy + 9, 2, 3, HI); } // قارچ/کریستال
  else if (v === 5) { for (let i = 0; i < 4; i++) r.rect(ox + 3 + i * 3, oy + 6 + (i % 2) * 3, 2, 2, DK); } // سنگریزه
  else { r.rect(ox + 2, oy + 2, 12, 1, HI); r.rect(ox + 2, oy + 2, 1, 12, HI); r.rect(ox + 3, oy + 3, 8, 8, null || [HI[0], HI[1], HI[2], 60]); } // تار
}

// ---------- ن۱۴۰: آرایشِ اتاق‌ها ----------
const RUG = [[132, 40, 52], [176, 64, 64], [214, 170, 82]]; // تیره/اصلی/حاشیه‌ی طلایی
const BAN = [[[150, 44, 56], [200, 72, 72]], [[52, 70, 130], [84, 108, 176]], [[60, 104, 64], [92, 150, 88]]];
const c4 = (c, a = 255) => [c[0], c[1], c[2], a];
function paintDress(r, ox, oy, d, P, x, y, DM, W) {
  const has = (X, Y, t) => { const e = DM.get(Y * W + X); return e && e.t === t; };
  if (d.t === 'rug') { // فرش با حاشیه‌ی طلایی فقط روی لبه‌های بیرونی
    r.rect(ox, oy, 16, 16, c4(d.v ? RUG[1] : RUG[0]));
    if (!has(x - 1, y, 'rug')) r.rect(ox, oy, 2, 16, c4(RUG[2])); if (!has(x + 1, y, 'rug')) r.rect(ox + 14, oy, 2, 16, c4(RUG[2]));
    if (!has(x, y - 1, 'rug')) r.rect(ox, oy, 16, 2, c4(RUG[2])); if (!has(x, y + 1, 'rug')) r.rect(ox, oy + 14, 16, 2, c4(RUG[2]));
    if (d.v && (x + y) % 2 === 0) { r.rect(ox + 7, oy + 5, 2, 6, c4(RUG[2], 200)); r.rect(ox + 5, oy + 7, 6, 2, c4(RUG[2], 200)); } // نقشِ لوزی
  } else if (d.t === 'mosaic') { // کاشیِ دایره‌ای محراب (فیروزه‌ای/کرم)
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) r.rect(ox + i * 4 + 1, oy + j * 4 + 1, 3, 3, ((i + j + x + y) & 1) ? c4(d.v ? [96, 196, 200] : [70, 140, 160]) : c4([214, 204, 176]));
  } else if (d.t === 'gold') { const j = (d.v * 3) % 6; r.ellipse(ox + 8, oy + 12, 5, 2, c4([120, 84, 30], 160)); r.rect(ox + 4 + j / 2, oy + 9, 6, 3, c4([232, 190, 70])); r.rect(ox + 5 + j / 2, oy + 8, 4, 1, c4([255, 236, 150])); r.rect(ox + 9, oy + 11, 3, 2, c4([200, 150, 50])); }
  else if (d.t === 'skull') { r.rect(ox + 5, oy + 7, 6, 5, c4([222, 214, 192])); r.rect(ox + 6, oy + 12, 4, 2, c4([180, 172, 150])); r.rect(ox + 6, oy + 9, 1, 1, c4([30, 24, 34])); r.rect(ox + 9, oy + 9, 1, 1, c4([30, 24, 34])); }
  else if (d.t === 'rubble') { const k = P[1], kd = P[3]; for (let i = 0; i < 4; i++) { const ax = ox + 2 + ((d.v * 5 + i * 4) % 11), ay = oy + 4 + ((d.v * 3 + i * 5) % 9); r.rect(ax, ay, 3, 2, k); r.rect(ax, ay + 2, 3, 1, kd); } }
  else if (d.t === 'moss') { const a = P[14]; for (let i = 0; i < 7; i++) r.rect(ox + ((d.v * 7 + i * 5) % 14), oy + ((d.v * 3 + i * 7) % 14), 2, 1, c4(a, 170)); }
  else if (d.t === 'bones') { const b = [214, 206, 184]; r.rect(ox + 3, oy + 8 + d.v % 3, 8, 1, c4(b)); r.rect(ox + 2, oy + 7 + d.v % 3, 2, 3, c4(b)); r.rect(ox + 10, oy + 7 + d.v % 3, 2, 3, c4(b)); r.rect(ox + 8, oy + 3, 2, 6, c4(b, 220)); }
  else if (d.t === 'puddle') { r.ellipse(ox + 8, oy + 9, 6, 3, c4([40, 70, 96], 170)); r.rect(ox + 5, oy + 8, 3, 1, c4([140, 190, 220], 160)); }
  else if (d.t === 'web') { const w = c4([220, 220, 230], 120); r.line?.(ox, oy, ox + 15, oy + 15, w); r.rect(ox + 2, oy + 2, 12, 1, w); r.rect(ox + 2, oy + 2, 1, 12, w); for (let i = 3; i < 14; i += 4) r.rect(ox + 2, oy + i, i, 1, w); }
  else if (d.t === 'ember') { for (let i = 0; i < 3; i++) r.rect(ox + 3 + ((d.v + i) * 5) % 10, oy + 4 + i * 4, 2, 1, c4([255, 140, 60], 200)); }
  else if (d.t === 'rails') { r.rect(ox, oy + 4, 16, 1, c4([120, 100, 80])); r.rect(ox, oy + 11, 16, 1, c4([120, 100, 80])); for (let i = 1; i < 16; i += 5) r.rect(ox + i, oy + 3, 2, 10, c4([92, 64, 40])); r.rect(ox, oy + 5, 16, 1, c4([170, 160, 150])); r.rect(ox, oy + 12, 16, 1, c4([170, 160, 150])); } // ریلِ معدن
  else if (d.t === 'grave') { r.rect(ox + 4, oy + 9, 8, 6, c4([70, 60, 50], 150)); r.rect(ox + 5, oy + 2, 6, 8, c4([150, 150, 160])); r.rect(ox + 6, oy + 1, 4, 1, c4([150, 150, 160])); r.rect(ox + 5, oy + 9, 6, 1, c4([96, 96, 110])); r.rect(ox + 7, oy + 4, 2, 1, c4([90, 90, 100])); r.rect(ox + 7, oy + 3, 1, 4, c4([90, 90, 100])); } // سنگِ قبر
  else if (d.t === 'candle') { r.rect(ox + 6, oy + 8, 2, 4, c4([236, 228, 200])); r.rect(ox + 6, oy + 6, 2, 2, c4([255, 200, 90])); r.rect(ox + 10, oy + 10, 2, 3, c4([236, 228, 200])); r.rect(ox + 10, oy + 9, 1, 1, c4([255, 220, 120])); r.rect(ox + 5, oy + 12, 8, 1, c4([180, 170, 140], 160)); }
  else if (d.t === 'crystal') { const c = [140, 210, 255]; r.rect(ox + 6, oy + 4, 3, 9, c4(c)); r.rect(ox + 7, oy + 2, 1, 2, c4(c)); r.rect(ox + 6, oy + 4, 1, 9, c4([230, 250, 255])); r.rect(ox + 10, oy + 8, 2, 5, c4([90, 160, 220])); r.rect(ox + 4, oy + 9, 2, 4, c4([90, 160, 220])); }
  else if (d.t === 'crack') { const c = c4([255, 110, 40], 230); r.rect(ox + 2, oy + 7, 5, 1, c); r.rect(ox + 6, oy + 8, 4, 1, c); r.rect(ox + 9, oy + 9, 5, 1, c); r.rect(ox + 7, oy + 4, 1, 4, c); r.rect(ox + 7, oy + 5, 1, 1, c4([255, 220, 120])); } // شکافِ گدازه
  else if (d.t === 'arrows') { const w = c4([120, 90, 60]), t = c4([200, 200, 210]); for (let i = 0; i < 3; i++) { const ax = ox + 3 + i * 4, ay = oy + 3 + ((d.v + i) % 3) * 2; r.rect(ax, ay + 2, 1, 8, w); r.rect(ax, ay, 1, 2, t); r.rect(ax - 1, ay + 9, 3, 1, c4([220, 220, 220])); } } // تیرهای فرورفته
  else if (d.t === 'claw') { const c = c4([30, 24, 30], 170); for (let i = 0; i < 3; i++) for (let k = 0; k < 7; k++) r.rect(ox + 3 + i * 3 + (k >> 1), oy + 4 + k, 1, 1, c); }
  else if (d.t === 'snow') { r.ellipse(ox + 8, oy + 9, 7, 4, c4([232, 240, 250], 210)); r.rect(ox + 4, oy + 7, 5, 1, c4([255, 255, 255])); }
  else if (d.t === 'sand') { r.ellipse(ox + 8, oy + 9, 7, 4, c4([196, 164, 104], 170)); for (let i = 0; i < 4; i++) r.rect(ox + 3 + i * 3, oy + 8 + (i & 1), 2, 1, c4([226, 196, 130])); }
  else if (d.t === 'vine') { const g = c4([70, 130, 60]), l = c4([110, 170, 80]); for (let k = 0; k < 14; k++) r.rect(ox + 2 + k, oy + 8 + Math.round(2 * Math.sin((k + d.v * 3) * 0.7)), 1, 1, g); r.rect(ox + 5, oy + 6, 2, 2, l); r.rect(ox + 11, oy + 9, 2, 2, l); }
  else if (d.t === 'spore') { for (let i = 0; i < 5; i++) { const x = ox + 2 + ((d.v * 5 + i * 3) % 12), y = oy + 3 + ((d.v * 7 + i * 5) % 11); r.rect(x, y, 2, 2, c4([150, 240, 160], 150)); r.rect(x, y, 1, 1, c4([220, 255, 210], 230)); } r.rect(ox + 9, oy + 10, 3, 3, c4([180, 60, 60])); r.rect(ox + 10, oy + 13, 1, 2, c4([230, 220, 200])); } // هاگِ درخشان + قارچِ کوچک
  else if (d.t === 'rune') { const c = c4([220, 60, 80], 200), h = c4([255, 150, 160], 230); r.rect(ox + 3, oy + 3, 10, 1, c); r.rect(ox + 3, oy + 12, 10, 1, c); r.rect(ox + 3, oy + 3, 1, 10, c); r.rect(ox + 12, oy + 3, 1, 10, c); r.rect(ox + 7, oy + 5, 2, 6, h); r.rect(ox + 5, oy + 7, 6, 2, h); } // نشانِ اهریمنی
  else if (d.t === 'armor') { r.rect(ox + 4, oy + 6, 6, 5, c4([110, 116, 130])); r.rect(ox + 4, oy + 6, 6, 1, c4([170, 176, 190])); r.rect(ox + 6, oy + 8, 2, 1, c4([40, 40, 50])); r.rect(ox + 10, oy + 9, 5, 1, c4([190, 196, 210])); r.rect(ox + 9, oy + 8, 1, 3, c4([120, 90, 50])); } // کلاه‌خود و شمشیرِ افتاده
  else if (d.t === 'scale') { for (let i = 0; i < 6; i++) r.rect(ox + 2 + ((d.v * 3 + i * 5) % 12), oy + 3 + ((d.v + i * 4) % 11), 2, 1, c4([90, 170, 90], 200)); }
  else if (d.t === 'ice') { r.rect(ox + 1, oy + 1, 14, 14, c4([190, 230, 255], 60)); r.rect(ox + 3, oy + 4, 5, 1, c4([240, 250, 255], 150)); }
}
function paintBanner(r, ox, oy, v, theme) { // پرچمِ آویخته روی نمای آجری
  const [dk, mid] = BAN[v % 3];
  r.rect(ox + 3, oy, 10, 1, c4([70, 50, 40])); r.rect(ox + 4, oy + 1, 8, 12, c4(mid)); r.rect(ox + 4, oy + 1, 2, 12, c4(dk));
  r.rect(ox + 4, oy + 13, 3, 2, c4(mid)); r.rect(ox + 9, oy + 13, 3, 2, c4(mid)); r.rect(ox + 7, oy + 5, 2, 3, c4([230, 196, 80]));
}

// ---------- ن۱۴۴: قطعه‌ی مرکزیِ ۳۲×۳۲ (روی ۲×۲ کاشیِ مسدود؛ هنگامِ کاشیِ چهارم کشیده می‌شود تا روی هر چهار بنشیند) ----------
const S = { st: [120, 118, 128], stH: [168, 166, 176], stD: [72, 70, 82], wd: [112, 76, 44], wdD: [72, 48, 28], ir: [80, 84, 96], irH: [150, 156, 170] };
function paintCentre(r, x, y, v, P) {
  const R = (a, b, w, h, c, al = 255) => r.rect(x + a, y + b, w, h, c4(c, al));
  r.ellipse(x + 16, y + 27, 14, 4, c4([0, 0, 0], 70)); // سایه
  if (v === 'well') { r.ellipse(x + 16, y + 17, 12, 9, c4(S.stD)); r.ellipse(x + 16, y + 16, 12, 9, c4(S.st)); r.ellipse(x + 16, y + 16, 8, 6, c4([24, 40, 60])); r.ellipse(x + 15, y + 15, 3, 1, c4([120, 170, 210], 180));
    for (let i = 0; i < 6; i++) R(4 + i * 4, 9 + (i % 2), 3, 2, S.stH); R(4, 2, 2, 14, S.wd); R(26, 2, 2, 14, S.wd); R(4, 2, 24, 2, S.wdD); R(15, 4, 1, 8, [190, 180, 150]); R(13, 11, 5, 3, S.wd); }
  else if (v === 'fire') { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; R(14 + Math.round(Math.cos(a) * 10), 17 + Math.round(Math.sin(a) * 6), 4, 3, i % 2 ? S.st : S.stD); }
    R(8, 18, 16, 3, S.wd); R(11, 15, 10, 3, S.wdD); r.ellipse(x + 16, y + 14, 6, 7, c4([230, 90, 40])); r.ellipse(x + 16, y + 15, 4, 5, c4([255, 170, 60])); r.ellipse(x + 16, y + 16, 2, 3, c4([255, 240, 170])); R(15, 4, 2, 4, [255, 120, 50], 200); R(19, 7, 1, 3, [255, 200, 90], 200); }
  else if (v === 'statue') { R(6, 20, 20, 7, S.stD); R(6, 19, 20, 2, S.stH); R(11, 8, 10, 12, S.st); R(11, 8, 3, 12, S.stH); R(12, 2, 8, 7, S.st); R(13, 2, 2, 7, S.stH); R(14, 4, 1, 1, S.stD); R(17, 4, 1, 1, S.stD); R(21, 3, 2, 17, S.irH); R(20, 12, 4, 1, S.stD); R(9, 9, 2, 8, S.st); }
  else if (v === 'altar') { R(4, 14, 24, 12, S.stD); R(4, 12, 24, 4, S.st); R(4, 12, 24, 1, S.stH); R(12, 12, 8, 14, [150, 40, 50]); R(12, 12, 8, 1, [210, 80, 80]); R(15, 18, 2, 4, [230, 190, 80]);
    for (const cx of [6, 24]) { R(cx, 5, 2, 7, [236, 228, 200]); R(cx, 3, 2, 2, [255, 200, 90]); } R(14, 7, 4, 5, [120, 200, 220]); R(15, 6, 2, 1, [220, 250, 255]); }
  else if (v === 'cage') { R(3, 24, 26, 3, S.ir); R(3, 3, 26, 2, S.ir); for (let i = 3; i < 30; i += 4) { R(i, 3, 2, 22, S.ir); R(i, 3, 1, 22, S.irH); } R(10, 19, 8, 2, [214, 206, 184]); R(18, 17, 5, 4, [222, 214, 192]); R(19, 18, 1, 1, [30, 24, 34]); R(21, 18, 1, 1, [30, 24, 34]); }
  else if (v === 'tree') { R(13, 14, 6, 13, S.wd); R(13, 14, 2, 13, [150, 104, 64]); R(9, 24, 5, 3, S.wdD); R(18, 24, 6, 3, S.wdD); const G = P[14];
    r.ellipse(x + 16, y + 10, 13, 9, c4([G[0] * 0.6, G[1] * 0.6, G[2] * 0.6])); r.ellipse(x + 14, y + 8, 10, 7, c4(G)); r.ellipse(x + 12, y + 6, 5, 3, c4([Math.min(255, G[0] + 60), Math.min(255, G[1] + 60), Math.min(255, G[2] + 60)]));
    for (let i = 0; i < 5; i++) R(6 + i * 5, 10 + (i % 2) * 4, 1, 1, [255, 240, 160]); }
  else if (v === 'crystal') { const C = [[90, 160, 220], [140, 210, 255], [230, 250, 255]]; R(6, 22, 20, 5, S.stD);
    for (const [a, b, w, h] of [[13, 2, 6, 22], [7, 10, 5, 13], [20, 8, 5, 15], [4, 16, 4, 8], [25, 15, 4, 9]]) { R(a, b, w, h, C[0]); R(a, b, 2, h, C[1]); R(a + 1, b - 2, w - 2, 2, C[1]); R(a, b + 1, 1, h >> 1, C[2]); } }
  else if (v === 'anvil') { R(4, 18, 10, 9, S.stD); R(4, 17, 10, 2, [255, 120, 50]); R(6, 15, 6, 2, [255, 200, 90], 200); R(15, 20, 12, 7, S.wdD); R(17, 16, 8, 4, S.ir); R(14, 12, 15, 4, S.ir); R(14, 12, 15, 1, S.irH); R(11, 13, 4, 2, S.ir); R(19, 6, 2, 6, S.wd); R(16, 4, 8, 3, S.irH); }
  else if (v === 'coffin') { R(9, 2, 14, 25, S.stD); R(8, 4, 16, 21, S.st); R(10, 2, 12, 2, S.st); R(8, 4, 16, 1, S.stH); R(15, 6, 2, 14, [214, 180, 80]); R(12, 10, 8, 2, [214, 180, 80]); R(10, 24, 12, 2, S.stD); }
  else if (v === 'fountain') { r.ellipse(x + 16, y + 19, 14, 8, c4(S.stD)); r.ellipse(x + 16, y + 18, 14, 8, c4(S.st)); r.ellipse(x + 16, y + 18, 11, 6, c4([50, 110, 160])); R(14, 6, 4, 13, S.stH); R(12, 5, 8, 2, S.st);
    for (const [a, b] of [[10, 3], [21, 3], [8, 8], [23, 8]]) R(a, b, 2, 2, [180, 220, 250], 200); R(15, 1, 2, 4, [200, 235, 255], 220); r.ellipse(x + 11, y + 18, 2, 1, c4([170, 220, 250], 200)); }
  else if (v === 'bones') { r.ellipse(x + 16, y + 20, 13, 7, c4([170, 160, 140])); for (let i = 0; i < 7; i++) R(5 + i * 3, 14 + (i % 3) * 3, 7, 2, [222, 214, 192]); for (const [a, b] of [[10, 10], [17, 8], [21, 13]]) { R(a, b, 6, 5, [230, 222, 200]); R(a + 1, b + 2, 1, 1, [30, 24, 34]); R(a + 4, b + 2, 1, 1, [30, 24, 34]); } }
}

// قطعه‌ی ۳×۳: همان طرح در بومِ موقتِ ۳۲px، با بزرگ‌نماییِ ۱٫۵ (نزدیک‌ترین پیکسل) روی ۴۸px — فقط پیکسل‌های پر
function paintCentreBig(r, x, y, v, P) {
  const T = new Raster(32, 32); paintCentre(T, 0, 0, v, P);
  for (let j = 0; j < 48; j++) for (let i = 0; i < 48; i++) { const s = ((j * 2 / 3 | 0) * 32 + (i * 2 / 3 | 0)) * 4, a = T.d[s + 3]; if (!a) continue;
    const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= r.w || Y >= r.h) continue; const o = (Y * r.w + X) * 4, k = a / 255;
    r.d[o] = r.d[o] * (1 - k) + T.d[s] * k; r.d[o + 1] = r.d[o + 1] * (1 - k) + T.d[s + 1] * k; r.d[o + 2] = r.d[o + 2] * (1 - k) + T.d[s + 2] * k; }
}
