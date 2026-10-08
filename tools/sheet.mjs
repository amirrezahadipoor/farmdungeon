// sheet.mjs — شیت‌ساز عمومی (S0.4): تایل/موب/مزرعه/دانجن با زوم و برچسب فونت۲ → shots/
// استفاده: node tools/sheet.mjs <tiles|mobs|farm|dungeon|all>
// صحنه‌های مرجع قطعی (random استاب‌شده) هم اینجا ساخته و به‌صورت ۱:۱ ذخیره می‌شوند: ref_*.png
import fs from 'node:fs';
import path from 'node:path';
import { savePNG } from './png.mjs';
import { Raster } from '../js/raster.js';
import { Run } from '../js/run.js';
import { Game } from '../js/game.js';
import { Monster } from '../js/monster.js';
import { groundSprite } from '../js/art/ground.js';
import { cropSprite, CROP_STAGES } from '../js/art/crops.js';
import { drawText } from '../js/art/font2.js';
import { MONSTER_KINDS, MOX, MOY } from '../js/art/monster_parts.js';
import { RAMP, RAMP_NAMES, RAMP_BASE_NAMES } from '../js/art/ramps.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const MODE = process.argv[2] || 'all';
const BG = [18, 16, 26, 255];
const KINDS = [...MONSTER_KINDS, 'boss'];
const CROPS = ['carrot', 'wheat', 'pumpkin', 'strawberry', 'eggplant', 'corn'];
const fixedRnd = (fn) => { const r = Math.random; Math.random = () => 0.4242; try { return fn(); } finally { Math.random = r; } };

function blit(dst, src, dx, dy, sc = 1, sx0 = 0, sy0 = 0, sw = src.w, sh = src.h) {
  for (let y = 0; y < sh * sc; y++) for (let x = 0; x < sw * sc; x++) {
    const i = ((sy0 + Math.floor(y / sc)) * src.w + sx0 + Math.floor(x / sc)) * 4;
    if (src.d[i + 3] === 0) continue;
    dst.px(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2], src.d[i + 3]]);
  }
}
function mobFrame(kind, state, t) {
  const e = new Monster(kind, 100, 100, 1);
  e.state = state; e.t = t; e.ph = 0.35; e.time = 1.4; e.flash = 0; e.face = 1;
  return e.sprite();
}
function farmScene(dayT = 100) {
  return fixedRnd(() => {
    const W = { coins: 500, inventory: { carrot: 0, wheat: 0, pumpkin: 0 }, selectedCrop: 'carrot', seeds: { carrot: 6 }, upgrades: {} };
    const g = new Game(W, 5, {});
    g.view = { w: 240, h: 160 }; g.dayT = dayT;
    const r = new Raster(240, 160); g.render(r);
    return r;
  });
}
function dungeonScene(seed, f) {
  return fixedRnd(() => {
    const run = new Run(seed, {});
    run.view = { w: 240, h: 160 };
    if (f > 1) run.loadFloor(f);
    for (let i = 0; i < 8; i++) run.update(1 / 30);
    const r = new Raster(240, 160); run.render(r);
    return r;
  });
}
const REF_FARM = [['day', 100], ['rain', 410], ['night', 2220]];
const REF_DUN = [[1, 'f01'], [6, 'f06'], [11, 'f11'], [16, 'f16'], [22, 'f22'], [27, 'f27']]; // S3.10: تم‌های ۴/۵

// ================= tiles =================
function sheetTiles() {
  const Z = 4, CELL = 16 * Z, GAP = 8, COLW = CELL + GAP;
  const farmKinds = [['grass'], ['soil'], ['soil', 'wet'], ['path'], ['hedge'], ['water'], ['fence'], ['fencePost'], ['bush']];
  const dunKinds = ['dfloor', 'wall', 'pillar', 'stairs', 'water', 'decor', 'gateL', 'gateR'];
  const H = 40 + farmKinds.length * (CELL + 20) + 30 + 4 * (2 * (CELL + 16) + 24) + 30 + CROPS.length * (Z * 24 + 20) + 40; // S5.2: بومِ محصول ۲۴ردیفه
  const W = 40 + 4 * COLW + 8 + (dunKinds.length + 1) * COLW;
  const r = new Raster(W, H);
  r.rect(0, 0, W, H, BG);
  drawText(r, 'شیت تایل — مزرعه و دانجن (زوم ×۴)', 12, 8, [240, 233, 200, 255], 2);
  let y = 40;
  drawText(r, 'تایل‌های مزرعه — ۴ واریانت از چپ', 12, y, [190, 230, 200, 255], 1); y += 14;
  for (const [k, wet] of farmKinds) {
    for (let v = 0; v < 4; v++) {
      const s = k === 'water' ? groundSprite('water', 0, false, v, 0) : groundSprite(k, v, wet === 'wet', 0, 0);
      blit(r, s, 12 + v * COLW, y, Z);
    }
    drawText(r, k + (wet === 'wet' ? ' (wet)' : ''), 12 + 4 * COLW, y + 26, [200, 200, 220, 255], 1);
    y += CELL + 20;
  }
  y += 14;
  drawText(r, 'تایل‌های دانجن — هر تم ۲ ردیف (واریانت ۰/۱)', 12, y, [230, 200, 190, 255], 1); y += 14;
  for (let t = 0; t < 4; t++) {
    drawText(r, `تم ${t}`, 12, y, [200, 210, 240, 255], 1);
    for (let v = 0; v < 2; v++) for (let i = 0; i < dunKinds.length; i++) {
      blit(r, groundSprite(dunKinds[i], v, false, 0, t), 12 + i * COLW, y + 12 + v * (CELL + 16), Z);
    }
    y += 2 * (CELL + 16) + 24;
  }
  drawText(r, 'محصولات — ۶ نوع × ۶ مرحله (زوم ×۴)', 12, y, [240, 220, 190, 255], 1); y += 14;
  for (const t of CROPS) {
    for (let st = 0; st < CROP_STAGES; st++) blit(r, cropSprite(t, st), 12 + st * COLW, y, Z);
    drawText(r, t, 12 + CROP_STAGES * COLW, y + 40, [200, 200, 220, 255], 1);
    y += Z * 24 + 20;
  }
  savePNG(path.join(SHOTS, 'sheet_tiles.png'), r);
  console.log('sheet_tiles.png', r.w + 'x' + r.h);
}

// ================= mobs =================
function sheetMobs() {
  const Z = 2, CW = 56 * Z, GAP = 10, STATES = ['idle', 'move', 'attack', 'die'];
  const LAB = 120, HEAD = 44, ROWH = CW + 18;
  const W = LAB + 4 * (CW + GAP) + 20, H = HEAD + KINDS.length * ROWH + 16;
  const r = new Raster(W, H);
  r.rect(0, 0, W, H, BG);
  drawText(r, 'شیت موجودات — ۱۴ موب + باس (ساکن/حرکت/حمله/مرگ)', 12, 8, [240, 233, 200, 255], 1);
  drawText(r, 'idle', LAB + CW / 2 - 8, 26, [150, 220, 150, 255], 1);
  drawText(r, 'move', LAB + CW + GAP + CW / 2 - 10, 26, [150, 200, 240, 255], 1);
  drawText(r, 'attack', LAB + 2 * (CW + GAP) + CW / 2 - 12, 26, [240, 190, 150, 255], 1);
  drawText(r, 'die', LAB + 3 * (CW + GAP) + CW / 2 - 6, 26, [230, 140, 140, 255], 1);
  KINDS.forEach((k, i) => {
    const y = HEAD + i * ROWH;
    drawText(r, k, 12, y + CW / 2 - 4, [230, 226, 200, 255], 1);
    STATES.forEach((st, j) => {
      const s = mobFrame(k, st, st === 'die' ? 0.7 : 0.5);
      blit(r, s, LAB + j * (CW + GAP), y, Z, MOX - 28, MOY - 52, 56, 56);
    });
    if (i % 2 === 0) r.rect(0, y - 4, W, ROWH - 4, [26, 24, 36, 120]);
  });
  savePNG(path.join(SHOTS, 'sheet_mobs.png'), r);
  console.log('sheet_mobs.png', r.w + 'x' + r.h);
}

// ================= farm / dungeon (شیت + ref) =================
function stack(scenes, title, out) {
  const Z = 2, W = 240 * Z, H = 34 + scenes.length * (160 * Z + 26) + 10;
  const r = new Raster(W, H);
  r.rect(0, 0, W, H, BG);
  drawText(r, title, 12, 8, [240, 233, 200, 255], 2);
  let y = 34;
  for (const [label, sc] of scenes) {
    drawText(r, label, 12, y, [190, 210, 240, 255], 1); y += 14;
    blit(r, sc, 0, y, Z);
    y += 160 * Z + 12;
  }
  savePNG(path.join(SHOTS, out), r);
  console.log(out, r.w + 'x' + r.h);
}
function sheetFarm() {
  const scenes = REF_FARM.map(([n, t]) => [`مزرعه — ${n === 'day' ? 'روز' : n === 'rain' ? 'باران' : 'شب'}`, farmScene(t)]);
  stack(scenes, 'صحنه‌های مرجع مزرعه (زوم ×۲)', 'sheet_farm.png');
  for (const [n, t] of REF_FARM) savePNG(path.join(SHOTS, `ref_farm_${n}.png`), farmScene(t));
  console.log('ref_farm_day/rain/night.png');
}
function sheetDungeon() {
  const scenes = REF_DUN.map(([f]) => [`دانجن — طبقه ${f} (تم ${Math.floor((f - 1) / 5) % 6})`, dungeonScene(13, f)]);
  stack(scenes, 'صحنه‌های مرجع دانجن — ۴ تم (زوم ×۲)', 'sheet_dungeon.png');
  for (const [f, tag] of REF_DUN) savePNG(path.join(SHOTS, `ref_dungeon_${tag}.png`), dungeonScene(13, f));
  console.log('ref_dungeon_f01/f06/f11/f16.png');
}

// ================= ramps (S1.1 — پالت مواد برای بازبینی چشمی) =================
function sheetRamps() {
  const Z = 3, SW = 16 * Z, GAP = 4, LAB = 132, HEAD = 44;
  const H = HEAD + RAMP_NAMES.length * (SW + 8) + 30;
  const W = LAB + 7 * (SW + GAP) + 130;
  const r = new Raster(W, H);
  r.rect(0, 0, W, H, BG);
  drawText(r, 'رمپ‌های مواد (S1.1) — ۷ پله: تیره → روشن', 12, 8, [240, 233, 200, 255], 2);
  drawText(r, 'پایه', LAB + 8, HEAD - 14, [150, 220, 150, 255], 1);
  drawText(r, 'هم‌نام → ماده‌ی پایه', LAB + 7 * (SW + GAP) + 24, HEAD - 14, [210, 180, 140, 255], 1);
  RAMP_NAMES.forEach((n, i) => {
    const y = HEAD + i * (SW + 8);
    const base = RAMP_BASE_NAMES.includes(n);
    drawText(r, n, 12, y + SW / 2 - 4, base ? [230, 226, 200, 255] : [170, 160, 190, 255], 1);
    for (let k = 0; k < 7; k++) { const c = RAMP[n][k]; r.rect(LAB + k * (SW + GAP), y, SW, SW, [c[0], c[1], c[2], 255]); }
    if (!base) {
      const src = RAMP_BASE_NAMES.find((b) => RAMP[b] === RAMP[n]);
      drawText(r, '→ ' + src, LAB + 7 * (SW + GAP) + 24, y + SW / 2 - 4, [200, 170, 130, 255], 1);
    }
    drawText(r, '#' + RAMP[n][3].slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''), LAB + 7 * (SW + GAP) + 24, y + SW / 2 + 8, [150, 150, 175, 255], 1);
  });
  savePNG(path.join(SHOTS, 'sheet_ramps.png'), r);
  console.log('sheet_ramps.png', r.w + 'x' + r.h, '(' + RAMP_BASE_NAMES.length + ' پایه / ' + RAMP_NAMES.length + ' نام)');
}

if (MODE === 'ramps' || MODE === 'all') sheetRamps();
if (MODE === 'tiles' || MODE === 'all') sheetTiles();
if (MODE === 'mobs' || MODE === 'all') sheetMobs();
if (MODE === 'farm' || MODE === 'all') sheetFarm();
if (MODE === 'dungeon' || MODE === 'all') sheetDungeon();
