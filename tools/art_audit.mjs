// art_audit.mjs — ممیزی پایدار آرت (نشست S0.3): سنجه‌های M1–M10 به‌صورت عددی + شیت بصری
// استفاده: node tools/art_audit.mjs            → چاپ جدول + shots/audit.json + shots/art_audit.png
//          ART_AUDIT_STRICT=1 node tools/art_audit.mjs → اگر M1/M2/M3 از ن۴۸ فاصله بگیرند، خروج ۱ (CI)
// قواعد: ایجنت تصویر نمی‌بیند (درس ۱۷) → همه‌ی معیارها عددی. خطِ پایه در shots/audit_baseline.json نگه داشته می‌شود.
import fs from 'node:fs';
import path from 'node:path';
import { savePNG } from './png.mjs';
import { Raster } from '../js/raster.js';
import { Run } from '../js/run.js';
import { Game } from '../js/game.js';
import { Monster } from '../js/monster.js';
import { heroSprite } from '../js/run_render.js';
import { groundSprite } from '../js/art/ground.js';
import { cropSprite } from '../js/art/crops.js';
import { MONSTER_KINDS, MOX, MOY } from '../js/art/monster_parts.js';
import { drawText } from '../js/art/font2.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const rnd = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const floor10 = (f) => f % 10 === 0;

// ---------- اسپرایت‌های آزمودنی (قطعی: t/ph کوانت‌شده + time ثابت) ----------
function mobSprite(kind, state = 'idle', t = 0.4, time = 1.2) {
  const e = new Monster(kind, 100, 100, 1);
  e.state = state; e.t = t; e.ph = 0.3; e.time = time; e.flash = 0; e.face = 1;
  return e.sprite(); // نکته: کلید کش `time` را ندارد → هر جا time فرق کند، t هم باید فرق کند
}
const runFor = () => { const r = new Run(13, {}); r.view = { w: 216, h: 150 }; r.hero.loco.t = 1.0; r.hero.loco.blink = false; return r; };
const heroHSpr = runFor();
const HERO = heroSprite(heroHSpr);
const KINDS = [...MONSTER_KINDS, 'boss'];
const SPRITES = KINDS.map((k) => [k, mobSprite(k)]);

// ---------- آماره‌های پیکسلی ----------
const isOpq = (d, i, th = 200) => d[i + 3] > th;
// ghost نیمه‌شفاف است (هیچ پیکسل α>200 ندارد) → فالبک آستانه‌ی ۶۰ با پرچم sem
function spriteStatsFB(s) {
  const a = spriteStats(s, 200);
  if (a.n > 0) return a;
  const b = spriteStats(s, 60); b.sem = true;
  return b;
}
function spriteStats(s, th = 200) {
  const d = s.d, W = s.w, H = s.h;
  let n = 0, sumL = 0, oSum = 0, oN = 0, shN = 0;
  const colors = new Set(), bands = new Set();
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, a = d[i + 3];
    if (a > th) {
      const L = lum(d[i], d[i + 1], d[i + 2]);
      n++; sumL += L;
      colors.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      let edge = false; // outline = پیکسل مات با همسایه‌ی شفاف
      if (x === 0 || d[i - 4 + 3] < 40) edge = true;
      else if (x === W - 1 || d[i + 4 + 3] < 40) edge = true;
      else if (y === 0 || d[i - W * 4 + 3] < 40) edge = true;
      else if (y === H - 1 || d[i + W * 4 + 3] < 40) edge = true;
      if (edge) { oSum += L; oN++; }
    } else if (a > 8) { shN++; bands.add(a); } // سایه/نیمه‌شفاف — باند = مقدار دقیق آلفا
  }
  return { n, avgL: n ? sumL / n : 0, colors: colors.size, outlineL: oN ? oSum / oN : 0, outlineN: oN, shadowPx: shN, bands: bands.size, bbox: [x0, y0, x1, y1] };
}

// ---------- کفِ هر تم دانجن (میانگین L کاشی‌های dfloor) ----------
const floorL = [0, 1, 2, 3].map((t) => {
  const rr = new Raster(16 * 8, 16);
  for (let i = 0; i < 8; i++) groundSprite('dfloor', i % 4, false, 0, t).over(rr, i * 16, 0);
  const st = spriteStats(rr);
  return st.avgL;
});
const floorAvg = floorL[1] ? (floorL[0] + floorL[1] + floorL[2] + floorL[3]) / 4 : 0;

// ---------- صحنه‌های مرجع ----------
// random قطعی برای ساخت صحنه (Monster/موجودات زمان تصادفی می‌گیرند → درز M6 ناپایدار می‌شد)
function fixedRnd(fn) { const r = Math.random; Math.random = () => 0.4242; try { return fn(); } finally { Math.random = r; } }
function farmSceneReal(dayT = 100) {
  const W = { coins: 500, inventory: { carrot: 0, wheat: 0, pumpkin: 0 }, selectedCrop: 'carrot', seeds: { carrot: 6 }, upgrades: {} };
  const g = new Game(W, 5, {});
  g.view = { w: 240, h: 160 }; g.dayT = dayT;
  const r = new Raster(240, 160);
  g.render(r);
  return r;
}
function dungeonSceneReal(seed = 13, f = 1) {
  const run = new Run(seed, {});
  run.view = { w: 240, h: 160 };
  if (f > 1) run.loadFloor(f);
  for (let i = 0; i < 8; i++) run.update(1 / 30);
  const r = new Raster(240, 160);
  run.render(r);
  return r;
}

// ---------- M6/M7/M8 روی یک صحنه (kinds=null → همه‌ی مرزها) ----------
function sceneMetrics(sc) {
  const { w, h, d } = sc;
  const Lc = (x, y) => { const i = (y * w + x) * 4; return lum(d[i], d[i + 1], d[i + 2]); };
  const op = (x, y) => d[(y * w + x) * 4 + 3] > 200;
  // M6: نسبت درز = میانگین اختلاف ستون مرزی ÷ ستون غیرمرزی
  let bs = 0, bn = 0, ns = 0, nn = 0;
  for (let x = 1; x < w; x++) {
    let s = 0, n = 0;
    for (let y = 0; y < h; y++) if (op(x, y) && op(x - 1, y)) { s += Math.abs(Lc(x, y) - Lc(x - 1, y)); n++; }
    if (!n) continue;
    const m = s / n;
    if (x % 16 === 0) { bs += m; bn++; } else { ns += m; nn++; }
  }
  const seam = bn && nn ? (bs / bn) / (ns / nn) : 0;
  // M8: ستون‌های مرزی سخت (جهش L>15 در ≥۲۵٪ ردیف‌ها و بدون پیکسل میانی)
  let hard = 0;
  for (let x = 16; x < w; x += 16) {
    let jump = 0, n = 0;
    for (let y = 0; y < h; y++) if (op(x, y) && op(x - 1, y)) { n++; if (Math.abs(Lc(x, y) - Lc(x - 1, y)) > 15) jump++; }
    if (n && jump / n > 0.25) hard++;
  }
  // M7: جفت‌تایل همسایه‌ی همسان (بایت‌به‌بایت، شامل آلفا)
  const tileEq = (ax, ay, bx, by) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const ia = ((ay + y) * w + ax + x) * 4, ib = ((by + y) * w + bx + x) * 4;
      if (d[ia + 3] !== d[ib + 3] || d[ia] !== d[ib] || d[ia + 1] !== d[ib + 1] || d[ia + 2] !== d[ib + 2]) return false;
    }
    return true;
  };
  let hEq = 0, hN = 0, vEq = 0, vN = 0;
  for (let ty = 0; ty < Math.floor(h / 16); ty++) for (let tx = 0; tx < Math.floor(w / 16) - 1; tx++) { hN++; if (tileEq(tx * 16, ty * 16, (tx + 1) * 16, ty * 16)) hEq++; }
  for (let ty = 0; ty < Math.floor(h / 16) - 1; ty++) for (let tx = 0; tx < Math.floor(w / 16); tx++) { vN++; if (tileEq(tx * 16, ty * 16, tx * 16, (ty + 1) * 16)) vEq++; }
  return { seam, hard, identical: hN + vN ? (hEq + vEq) / (hN + vN) : 0 };
}

// ---------- M5: پالت مستر موقت (همه‌ی کاشی‌های زمین) + ΔE ----------
function masterPalette() {
  const set = new Set();
  const kinds = ['grass', 'soil', 'path', 'hedge', 'water', 'fence', 'dfloor', 'wall', 'stairs', 'gateL', 'gateR', 'pillar', 'decor', 'bush', 'fencePost'];
  for (const k of kinds) for (let v = 0; v < 4; v++) for (let t = 0; t < 4; t++) {
    const s = groundSprite(k, v, false, 0, t);
    for (let i = 0; i < s.d.length; i += 4) if (s.d[i + 3] > 200) set.add((s.d[i] << 16) | (s.d[i + 1] << 8) | s.d[i + 2]);
  }
  for (const t of ['carrot', 'wheat', 'pumpkin', 'strawberry', 'eggplant', 'corn']) for (let st = 0; st < 4; st++) {
    const s = cropSprite(t, st);
    for (let i = 0; i < s.d.length; i += 4) if (s.d[i + 3] > 200) set.add((s.d[i] << 16) | (s.d[i + 1] << 8) | s.d[i + 2]);
  }
  return [...set].map((v) => [(v >> 16) & 255, (v >> 8) & 255, v & 255]);
}
function paletteCoverage(sc, pal) {
  let inP = 0, tot = 0;
  const d = sc.d;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    tot++;
    for (const [pr, pg, pb] of pal) {
      const dr = d[i] - pr, dg = d[i + 1] - pg, db = d[i + 2] - pb;
      if (Math.sqrt((dr * dr + dg * dg + db * db) / 3) < 6) { inP++; break; }
    }
  }
  return tot ? inP / tot : 0;
}

// ---------- M9: diff فریم (٪ پیکسل متفاوت، آلفا>۱۲۰، تفاوت کانالی>۸) ----------
function frameDiff(a, b) {
  let diff = 0, n = 0;
  for (let i = 0; i < a.d.length; i += 4) {
    if (a.d[i + 3] <= 120 && b.d[i + 3] <= 120) continue;
    n++;
    if (Math.abs(a.d[i] - b.d[i]) > 8 || Math.abs(a.d[i + 1] - b.d[i + 1]) > 8 || Math.abs(a.d[i + 2] - b.d[i + 2]) > 8 || Math.abs(a.d[i + 3] - b.d[i + 3]) > 8) diff++;
  }
  return n ? diff / n : 0;
}

// ================= اجرا =================
const M = {};
const t0 = Date.now();

// M1 — خوانایی: ΔL اسپرایت در برابر کف (کمینه روی موب‌ها × ۴ تم)
const heroL = spriteStats(HERO).avgL;
const m1Rows = SPRITES.map(([k, s]) => {
  const L = spriteStatsFB(s).avgL;
  const dmin = Math.min(...floorL.map((f) => Math.abs(L - f)));
  return { kind: k, L, dL: dmin, dLavg: Math.abs(L - floorAvg) };
});
const batRow = m1Rows.find((r) => r.kind === 'bat');
const mobRows = m1Rows.filter((r) => r.kind !== 'boss'); // باس جداست (اسپرایت بزرگ/تیره — سنجه‌ی خودش در P6)
M.M1 = { min: Math.min(...mobRows.map((r) => r.dL)), bat: batRow ? rnd(batRow.dL) : null, boss: rnd((m1Rows.find((r) => r.kind === 'boss') || { dL: 0 }).dL), hero: rnd(Math.abs(heroL - floorAvg)), floorL: floorL.map(rnd), rows: m1Rows.map((r) => ({ k: r.kind, L: rnd(r.L), dL: rnd(r.dL) })) };

// M2/M3/M4 — از same SPRITES + hero
const stHero = spriteStats(HERO);
const stAll = SPRITES.map(([k, s]) => [k, spriteStatsFB(s)]);
const outL = [stHero.outlineL, ...stAll.map(([, st]) => st.outlineL)];
const meanOL = outL.reduce((a, b) => a + b, 0) / outL.length;
const sdOL = Math.sqrt(outL.reduce((a, b) => a + (b - meanOL) ** 2, 0) / outL.length);
M.M2 = { sd: rnd(sdOL, 1), mean: rnd(meanOL), hero: rnd(stHero.outlineL), worst: [...stAll].sort((a, b) => Math.abs(b[1].outlineL - meanOL) - Math.abs(a[1].outlineL - meanOL)).slice(0, 3).map(([k, st]) => [k, rnd(st.outlineL)]) };
M.M3 = { hero: stHero.colors, mobsMin: Math.min(...stAll.map(([, st]) => st.colors)), mobsMax: Math.max(...stAll.map(([, st]) => st.colors)), mobs: stAll.map(([k, st]) => [k, st.colors]) };
M.M4 = { minBands: Math.min(stHero.bands, ...stAll.map(([, st]) => st.bands)), heroBands: stHero.bands, mobs: stAll.map(([k, st]) => [k, st.bands]) };

// صحنه‌های مرجع (برای M5–M8 + شیت)
const farmScene = (dayT) => fixedRnd(() => farmSceneReal(dayT));
const dungeonScene = (seed, f) => fixedRnd(() => dungeonSceneReal(seed, f));
const FARM = farmScene(100), DUN = dungeonScene(13, 1); // صحنه‌های مرجع ۱:۱ از S0.4 در tools/sheet.mjs ساخته می‌شوند
M.M6 = { farm: rnd(sceneMetrics(FARM).seam, 2), dungeon: rnd(sceneMetrics(DUN).seam, 2) };
M.M7 = { farm: rnd(sceneMetrics(FARM).identical * 100, 1), dungeon: rnd(sceneMetrics(DUN).identical * 100, 1) };
M.M8 = { farm: sceneMetrics(FARM).hard, dungeon: sceneMetrics(DUN).hard };
M.M5 = { pct: rnd(paletteCoverage(FARM, masterPalette()) * 100, 1), scene: 'مزرعه‌ی مرجع' };

// M9 — idle زنده + حمله‌ی اسکلت/کماندار
const idle = {}, idleAmp = {}, atk = {};
for (const k of KINDS) {
  idle[k] = rnd(frameDiff(mobSprite(k, 'idle', 0.375), mobSprite(k, 'idle', 0.5)) * 100, 1); // دو فریم کوانت مجاور
  const f0 = mobSprite(k, 'idle', 0.375, 1.2);
  let amp = 0;
  for (let q = 1; q <= 8; q++) amp = Math.max(amp, frameDiff(f0, mobSprite(k, 'idle', 0.375 + q * 0.125, 1.2 + q * 0.125))); // دامنه‌ی یک چرخه‌ی کامل (t و time هم‌زمان جلو می‌روند = آنچه بازیکن می‌بیند)
  idleAmp[k] = rnd(amp * 100, 1);
  atk[k] = rnd(frameDiff(mobSprite(k, 'attack', 0.3), mobSprite(k, 'attack', 0.6)) * 100, 1); // wind-up (0.3) → ضربه (0.6)، time ثابت
}
M.M9 = { idleMin: Math.min(...Object.values(idleAmp)), idle, idleAmp, skelAtk: atk.skeleton, archerAtk: atk.archer, atk };
M.M9.idleWeak = Object.entries(idleAmp).filter(([, v]) => v < 12).map(([k, v]) => k + ':' + v);

// M10 — محصول: ارتفاع رسیده + مراحل بصری
const CROPS = ['carrot', 'wheat', 'pumpkin', 'strawberry', 'eggplant', 'corn'];
const cropH = {};
for (const t of CROPS) {
  const s = cropSprite(t, 3);
  const st = spriteStats(s, 150);
  cropH[t] = st.bbox[1] > st.bbox[3] ? 0 : st.bbox[3] - st.bbox[1] + 1;
}
M.M10 = { min: Math.min(...Object.values(cropH)), max: Math.max(...Object.values(cropH)), stages: 4, per: cropH };

// ---------- امتیاز (هدف‌های ROADMAP) ----------
const goals = {
  M1: M.M1.min >= 25, M2: M.M2.sd <= 12, M3: M.M3.hero >= 10 && M.M3.hero <= 28 && M.M3.mobsMin >= 10 && M.M3.mobsMax <= 28,
  M4: M.M4.minBands >= 4, M5: M.M5.pct >= 97, M6: M.M6.farm >= 0.8 && M.M6.farm <= 1.25 && M.M6.dungeon >= 0.8 && M.M6.dungeon <= 1.25,
  M7: M.M7.farm <= 15 && M.M7.dungeon <= 15, M8: M.M8.farm === 0 && M.M8.dungeon === 0,
  M9: M.M9.idleMin >= 12 && M.M9.skelAtk >= 25 && M.M9.archerAtk >= 25, M10: M.M10.min >= 12 && M.M10.stages === 6,
};
const passed = Object.values(goals).filter(Boolean).length;
const score = rnd((passed / 11) * 10, 1);

// ---------- شیت بصری (برای قضاوت کاربر در ایست‌های 🛑) ----------
function blit(dst, src, dx, dy, sc = 1, sx0 = 0, sy0 = 0, sw = src.w, sh = src.h) {
  for (let y = 0; y < sh * sc; y++) for (let x = 0; x < sw * sc; x++) {
    const i = ((sy0 + Math.floor(y / sc)) * src.w + sx0 + Math.floor(x / sc)) * 4;
    if (src.d[i + 3] === 0) continue;
    dst.px(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2], src.d[i + 3]]);
  }
}
{
  const SHEET_W = 480, PAD = 8;
  const mobCell = 56, mobRows = Math.ceil(KINDS.length / 8);
  const cropCell = 32, cropRows = 2;
  const HEAD = 34;
  const H = HEAD + 160 * 2 + 20 + mobRows * (mobCell + 14) + 14 + cropRows * (cropCell + 12) + 14;
  const sheet = new Raster(SHEET_W, H);
  for (let i = 0; i < sheet.d.length; i += 4) { sheet.d[i] = 18; sheet.d[i + 1] = 16; sheet.d[i + 2] = 26; sheet.d[i + 3] = 255; }
  drawText(sheet, 'ممیزی آرت — ن۵۲/S0.3', PAD, 8, [240, 233, 200, 255], 2);
  let y = HEAD;
  drawText(sheet, 'صحنه‌ی مرجع: مزرعه (روز)', PAD, y, [190, 210, 240, 255], 1); y += 12;
  blit(sheet, FARM, 0, y, 2); y += 160 * 2 + 8;
  drawText(sheet, 'صحنه‌ی مرجع: دانجن (تم سنگ، طبقه ۱)', PAD, y, [190, 210, 240, 255], 1); y += 12;
  blit(sheet, DUN, 0, y, 2); y += 160 * 2 + 8;
  drawText(sheet, 'هیولاها — فریم ساکن (۱۴ + باس) با عدد ΔL:', PAD, y, [190, 240, 200, 255], 1); y += 12;
  SPRITES.forEach(([k, s], i) => {
    const col = i % 8, row = (i / 8) | 0;
    const cx = PAD + col * (mobCell + 4), cy = y + row * (mobCell + 14);
    blit(sheet, s, cx, cy, 1, MOX - 26, MOY - 48, 52, 52);
    drawText(sheet, k.slice(0, 7), cx, cy + mobCell, [200, 200, 220, 255], 1);
    const dL = M.M1.rows[i] ? M.M1.rows[i].dL : 0;
    drawText(sheet, (dL >= 25 ? '+' : '') + String(dL), cx + 30, cy + mobCell, dL >= 25 ? [150, 220, 150, 255] : [230, 140, 140, 255], 1);
  });
  y += mobRows * (mobCell + 14) + 6;
  drawText(sheet, 'قهرمان (ΔL ' + M.M1.hero + ') + محصولات ۶ نوع × ۴ مرحله:', PAD, y, [240, 210, 190, 255], 1); y += 12;
  blit(sheet, HERO, PAD, y, 2);
  CROPS.forEach((t, i) => {
    const row = i < 3 ? 0 : 1, col = i % 3;
    for (let st = 0; st < 4; st++) blit(sheet, cropSprite(t, st), 90 + col * (4 * cropCell + 18) + st * cropCell, y + row * (cropCell + 12), 2);
  });
  savePNG(path.join(SHOTS, 'art_audit.png'), sheet);
}
// ---------- گزارش ----------
const verdict = { M1: '≥۲۵', M2: '≤۱۲', M3: '۱۰–۲۸', M4: '≥۴', M5: '≥۹۷٪', M6: '۰٫۸–۱٫۲۵', M7: '≤۱۵٪', M8: '=۰', M9: 'idle≥۱۲٪ حمله≥۲۵٪', M10: '≥۱۲px × ۶مرحله' };
const fmt = {
  M1: `کمینه ΔL=${M.M1.min} (bat=${M.M1.bat}) · قهرمان=${M.M1.hero}`,
  M2: `انحراف=${M.M2.sd} میانگین=${M.M2.mean} (بدترین: ${M.M2.worst.map((w) => w.join(':')).join(' ')})`,
  M3: `قهرمان=${M.M3.hero} · موب‌ها ${M.M3.mobsMin}..${M.M3.mobsMax}`,
  M4: `کمینه باند سایه=${M.M4.minBands} (قهرمان=${M.M4.heroBands})`,
  M5: `${M.M5.pct}٪ داخل پالت موقت (${M.M5.scene})`,
  M6: `مزرعه=${M.M6.farm} دانجن=${M.M6.dungeon}`,
  M7: `مزرعه=${M.M7.farm}٪ دانجن=${M.M7.dungeon}٪`,
  M8: `مزرعه=${M.M8.farm} دانجن=${M.M8.dungeon} مرز سخت`,
  M9: `کمینه دامنه‌ی idle=${M.M9.idleMin}٪ (یخ‌زده: ${M.M9.idleWeak.join(' ') || '—'}) · حمله اسکلت=${M.M9.skelAtk}٪ کماندار=${M.M9.archerAtk}٪`,
  M10: `ارتفاع ${M.M10.min}..${M.M10.max}px × ${M.M10.stages} مرحله`,
};
console.log('\n════════ ممیزی آرت (S0.3) ════════');
for (const k of ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10']) {
  console.log(`${k}  ${goals[k] ? '✔' : '✘'}  ${fmt[k]}   (هدف ${verdict[k]})`);
}
console.log(`M11 پرفورمنس: جدا در tools/bench.mjs (S0.4)`);
console.log(`امتیاز سنجه‌محور: ${passed}/11 → ${score}/10   (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
const core = { bat_dL: M.M1.bat, outline_sd: M.M2.sd, hero_colors: M.M3.hero };
console.log(`لنگرهای ن۴۸: bat ΔL=${core.bat_dL} (پایه ۳) · outline انحراف=${core.outline_sd} (پایه ۴۲) · قهرمان ${core.hero_colors} رنگ (پایه ۸۲)`);
const out = { ts: new Date().toISOString(), score, passed, goals, metrics: M, anchors: core };
fs.writeFileSync(path.join(SHOTS, 'audit.json'), JSON.stringify(out, null, 1));
const baseFile = path.join(SHOTS, 'audit_baseline.json');
if (!fs.existsSync(baseFile) || process.env.ART_AUDIT_SAVE_BASELINE === '1') { fs.writeFileSync(baseFile, JSON.stringify(out, null, 1)); console.log('baseline ذخیره شد: shots/audit_baseline.json'); }
if (process.env.ART_AUDIT_STRICT === '1') {
  const near = (v, t, tol) => Math.abs(v - t) <= tol;
  const ok = near(core.bat_dL, 3, 3) && near(core.outline_sd, 42, 12) && near(core.hero_colors, 82, 14);
  console.log('STRICT (هم‌خوانی با ن۴۸): ' + (ok ? 'OK' : 'MISMATCH'));
  process.exitCode = ok ? 0 : 1;
}
