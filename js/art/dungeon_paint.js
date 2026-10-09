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
