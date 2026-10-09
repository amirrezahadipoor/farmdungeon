// tools/hero_ref_shot.mjs — S10.6 مرحله‌ی ۱: فریمِ ثابتِ روبه‌رو → shots/hero_front_idle.png (۴×) + سنجه‌های پذیرش
import { heroRefLayers, composeRef, outlineRef, REF_PAL, REF_W, REF_H, REF_FEATURES } from '../js/art/hero_ref.js';
import { Raster } from '../js/raster.js';
import { savePNG } from './png.mjs';
const luma0 = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const Z = 4, out = process.argv[2] || new URL('../shots/hero_front_idle.png', import.meta.url).pathname;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const Lstar = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const Y = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); return 116 * (Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116) - 16; };
const layers = heroRefLayers(), c = outlineRef(composeRef(layers));
// PNG ۴× روی زمینِ خنثیِ #FF00FF و نسخه‌ی روی زمینِ دانجن/مزرعه کنارِ هم
const BG = [[255, 0, 255], [44, 40, 70], [56, 98, 44]];
const img = new Raster(REF_W * Z * BG.length, REF_H * Z);
BG.forEach((bg, k) => { for (let y = 0; y < REF_H; y++) for (let x = 0; x < REF_W; x++) { const col = c[y][x] ? rgb(REF_PAL[c[y][x]]) : bg; for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) { const q = ((y * Z + j) * img.w + (k * REF_W + x) * Z + i) * 4; img.d[q] = col[0]; img.d[q + 1] = col[1]; img.d[q + 2] = col[2]; img.d[q + 3] = 255; } } });
savePNG(out, img);
// ---- سنجه‌ها ----
const cells = []; for (let y = 0; y < REF_H; y++) for (let x = 0; x < REF_W; x++) if (c[y][x]) cells.push([x, y, c[y][x]]);
const used = new Set(cells.map((p) => p[2]));
const feat = new Set(REF_FEATURES.map(([x, y]) => x + ',' + y));
const iso = cells.filter(([x, y, k]) => !feat.has(x + ',' + y) && ![-1, 0, 1].some((a) => [-1, 0, 1].some((b) => (a || b) && c[y + b] && c[y + b][x + a] === k)));
// تک‌تکه + سوراخ: flood از لبه‌ی بوم روی خانه‌های خالی؛ خالیِ نرسیده = سوراخ
const seen = new Set(); const st = [];
for (let x = 0; x < REF_W; x++) { st.push([x, 0], [x, REF_H - 1]); } for (let y = 0; y < REF_H; y++) { st.push([0, y], [REF_W - 1, y]); }
while (st.length) { const [x, y] = st.pop(); const k = x + ',' + y; if (x < 0 || y < 0 || x >= REF_W || y >= REF_H || seen.has(k) || c[y][x]) continue; seen.add(k); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
let holes = 0; for (let y = 0; y < REF_H; y++) for (let x = 0; x < REF_W; x++) if (!c[y][x] && !seen.has(x + ',' + y)) holes++;
const comp = new Set(); const s2 = [[cells[0][0], cells[0][1]]];
while (s2.length) { const [x, y] = s2.pop(); const k = x + ',' + y; if (comp.has(k) || !c[y] || !c[y][x]) continue; comp.add(k); s2.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
const inner = cells.filter((p) => p[2] !== 'o');
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b; // همان lum() در art_audit (M1)
const Yh = cells.reduce((a, p) => a + luma(rgb(REF_PAL[p[2]])), 0) / cells.length; // با outline، مثلِ spriteStats
const ys = inner.map((p) => p[1]), xs = inner.map((p) => p[0]);
const Ls = [...used].map((k) => Lstar(rgb(REF_PAL[k])));
// ΔL مثلِ M1 در برابر کفِ دانجن (میانگینِ ۴ تم از audit.json اگر بود) و چمنِ مزرعه
let floorL = luma0([44, 40, 70]);
try { const a = JSON.parse((await import('node:fs')).readFileSync(new URL('../shots/audit.json', import.meta.url))); const f = a.metrics?.M1?.floorL; if (f && f.length) floorL = f.reduce((x, y) => x + y, 0) / f.length; } catch (e) { /* پیش‌فرض */ }
const R = {
  canvas: `${REF_W}x${REF_H}`, height: Math.max(...ys) - Math.min(...ys) + 1, width: Math.max(...xs) - Math.min(...xs) + 1,
  colors: used.size, darkestL: +Math.min(...Ls).toFixed(1), isolated: iso.length, features1px: REF_FEATURES.length,
  pieces: comp.size === cells.length ? 1 : 'multi', holes, M1_dL_dungeonFloor: +Math.abs(Yh - floorL).toFixed(1), M1_dL_farmGrass: +Math.abs(Yh - luma([56, 98, 44])).toFixed(1), heroLuma: +Yh.toFixed(1), floorLuma: +floorL.toFixed(1),
  layers: Object.fromEntries(Object.entries(layers).map(([n, L]) => [n, L.flat().filter(Boolean).length])),
};
console.log(JSON.stringify(R));
if (iso.length) console.log('isolated:', iso.slice(0, 10).map((p) => p.join(',')).join(' '));
