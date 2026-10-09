// tools/hero_sheet.mjs — S10.4: شیتِ قهرمان (۴ جهت × idle۴ + walk۶ + run۶ + ضربه) روی زمینِ چمن/دانجن + اثرانگشتِ فریم‌ها
// استفاده: node tools/hero_sheet.mjs [out.png]  → shots/hero_sheet.png + چاپِ قد/رنگ/هشِ هر فریم
import { drawHeroFrame, halfSprite } from '../js/art/hero.js';
import { Raster } from '../js/raster.js';
import { savePNG } from './png.mjs';
const out = process.argv[2] || new URL('../shots/hero_sheet.png', import.meta.url).pathname;
const DIRS = ['down', 'right', 'up', 'left'];
const ROWS = [];
for (const dir of DIRS) {
  const row = [];
  for (let f = 0; f < 4; f++) row.push({ dir, anim: 'idle', phase: (f + 0.5) / 4 });
  for (let f = 0; f < 6; f++) row.push({ dir, anim: 'walk', phase: (f + 0.5) / 6 });
  for (const a of [0.2, 0.5]) row.push({ dir, anim: 'idle', phase: 0.125, tool: 'sword', actP: a });
  ROWS.push(row);
}
const CW = 30, CH = 42, Z = 2;
const sheet = new Raster(CW * ROWS[0].length * Z, CH * ROWS.length * 2 * Z);
const fnv = (d) => { let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
const stats = [];
ROWS.forEach((row, j) => row.forEach((o, i) => {
  const s = halfSprite(drawHeroFrame({ moveW: 1, tool: 'none', actP: -1, ...o }));
  let y0 = 99, y1 = -1; const cols = new Set();
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const k = (y * s.w + x) * 4; if (s.d[k + 3] > 200) { const sh = s.d[k] < 20 && s.d[k + 1] < 20 && s.d[k + 2] < 30; if (!sh) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } cols.add((s.d[k] << 16) | (s.d[k + 1] << 8) | s.d[k + 2]); } }
  stats.push({ k: `${o.dir}/${o.anim}${o.actP != null ? '+atk' : ''}/${i}`, h: y1 - y0 + 1, c: cols.size, fp: fnv(s.d) });
  for (const bg of [0, 1]) {
    const by = (j * 2 + bg) * CH, bx = i * CW, G = bg ? [44, 40, 70] : [56, 98, 44];
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) for (let zy = 0; zy < Z; zy++) for (let zx = 0; zx < Z; zx++) {
      const sx = x + 17, sy = y + 8; let c = G;
      if (sx >= 0 && sy >= 0 && sx < s.w && sy < s.h) { const k = (sy * s.w + sx) * 4; if (s.d[k + 3] > 0) { const a = s.d[k + 3] / 255; c = [s.d[k] * a + G[0] * (1 - a), s.d[k + 1] * a + G[1] * (1 - a), s.d[k + 2] * a + G[2] * (1 - a)]; } }
      const q = (((by + y) * Z + zy) * sheet.w + (bx + x) * Z + zx) * 4; sheet.d[q] = c[0]; sheet.d[q + 1] = c[1]; sheet.d[q + 2] = c[2]; sheet.d[q + 3] = 255;
    }
  }
}));
savePNG(out, sheet);
const hs = stats.map((s) => s.h), cs = stats.map((s) => s.c);
console.log(`قد ${Math.min(...hs)}..${Math.max(...hs)}px · رنگ ≤${Math.max(...cs)} · فریم‌ها ${stats.length} · یکتا ${new Set(stats.map((s) => s.fp)).size}`);
for (const s of stats) console.log(`${s.k}\th=${s.h}\tc=${s.c}\t${s.fp}`);
