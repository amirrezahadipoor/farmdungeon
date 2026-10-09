// tools/soak.mjs — S10.1: تستِ «خیساندن» برای قفل/نشتی (اجرا: node --expose-gc tools/soak.mjs [--quick])
// دانجن: ≥۲۰ طبقه و ≥۳۰۰۰ث شبیه‌سازی با فرمان‌های تصادفی (حرکت/دوج/مهارت/پله/محراب/باس)
// مزرعه: کارگر×۲ + آبپاش + سبد + App.helperTick + چرخه‌ی شب/باران برای ≥۲ ساعتِ شبیه‌سازی
// گزارش: بیشینه‌ی ms هر update/render، ساختِ طبقه (کلِ ساخت + بیشینه‌ی تکه در فریم)، موجودات/ذرات/FX، NaN/∞، رشدِ حافظه
// طبقه‌ی ۱ = گرم‌شدنِ JIT/کش‌ها (زیرِ فیدِ ورود) — جدا گزارش می‌شود، در پذیرش نیست
// پذیرش (exit≠0 اگر قرمز): update ≤۵۰ms · تکه‌ی ساختِ طبقه p99 ≤۱۶ms (≤۱٪ بالای ۱۶، هیچ‌کدام >۳۳) · NaN=۰ · رشدِ heap ≤ ۸MB
import { Run } from '../js/run.js';
import { Game } from '../js/game.js';
import { App } from '../js/app.js';
import { defaultSave } from '../js/save.js';
import { Raster } from '../js/raster.js';
import { TILE } from '../js/tiles.js';

globalThis.__BAKE_BUDGET = 8; // مثلِ مرورگر: پختِ تکه‌تکه
const QUICK = process.argv.includes('--quick');
const DT = 1 / 30, RENDER_EVERY = 3;
const DUN_SEC = QUICK ? 400 : 3000, MIN_FLOORS = QUICK ? 6 : 22, FARM_SEC = QUICK ? 900 : 7300;
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gc = () => { if (global.gc) { global.gc(); global.gc(); } };
const heapMB = () => process.memoryUsage().heapUsed / 1048576;
const bad = (v) => typeof v === 'number' && !Number.isFinite(v);
const fails = [];
const pct = (a, q) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };

// ---------------- دانجن ----------------
function soakDungeon() {
  const run = new Run(7, {});
  run.view = { w: 240, h: 160 };
  const r = new Raster(240, 160);
  const slices = []; let coldSlice = 0, upMax = 0, upMaxAt = '', rMax = 0, rMaxAt = '', nan = 0, entMax = 0, fxMax = 0, projMax = 0;
  let buildMax = 0, buildSliceMax = 0, floors = 1, floorT = 0, boons = 0, bosses = 0, frames = 0;
  const cmd = { move: 0, dash: 0, skill: 0, stairs: 0, shrine: 0, boss: 0 };
  // گرم‌کردن + خطِ پایه‌ی حافظه بعد از ۳ طبقه (کش‌های تم/اسپرایت پر شوند)
  const heap = [];
  const T = Math.round(DUN_SEC / DT);
  for (let i = 0; i < T || floors < MIN_FLOORS; i++) {
    const h = run.hero, D = run.dungeon;
    h.hp = run.maxHp; // هارنس: نامیرا (گیم‌پلی دست نمی‌خورد — فقط مدتِ تست)
    if (i % 30 === 0) { // یک فرمان در ثانیه
      const k = rnd();
      if (k < 0.45) { // حرکت به خانه‌ی تصادفیِ قابل‌رفت
        for (let tries = 0; tries < 20; tries++) {
          const gx = (rnd() * D.cols) | 0, gy = (rnd() * D.rows) | 0;
          if (D.walkable(gx, gy)) { run.moveTo(gx * TILE + 8, gy * TILE + 8); cmd.move++; break; }
        }
      } else if (k < 0.6) { run.tryDash(rnd() * 2 - 1, rnd() * 2 - 1); cmd.dash++; }
      else if (k < 0.75) { run.trySkill(); cmd.skill++; }
      else if (k < 0.85 && D.shrine && !D.shrine.used) { // محراب: برو و برکت بگیر
        run.moveTo(D.shrine.x, D.shrine.y); cmd.shrine++;
        if (Math.hypot(h.x - D.shrine.x, h.y - D.shrine.y) < 16) { run.applyBoon(['dmg', 'hp', 'speed', 'crit', 'greed', 'range'][(rnd() * 6) | 0]); D.shrine.used = true; boons++; }
      } else { // پله (اگر بسته است: باس را هدف بگیر)
        const boss = D.enemies.find((e) => e.isBoss && e.state !== 'die');
        if (boss) { run.moveTo(boss.x, boss.y); cmd.boss++; if (floorT > 40) boss.hp = Math.min(boss.hp, 1); }
        else { const s = D.grid.find((c) => c.kind === 'stairs'); if (s) { run.moveTo(s.x * TILE + 8, s.y * TILE + 8); cmd.stairs++; } }
      }
    }
    // سقفِ ماندن در طبقه: ۱۵۰ث ⇒ روی پله بگذار (تا ≥۲۰ طبقه در ۳۰۰۰ث)
    if (floorT > 150 && run.stairsOpen()) { const s = D.grid.find((c) => c.kind === 'stairs'); if (s) { h.x = s.x * TILE + 8; h.y = s.y * TILE + 8; } }
    const f0 = run.floor;
    const t0 = performance.now();
    run.update(DT, null);
    const dtU = performance.now() - t0;
    frames++;
    if (run.floor !== f0) { // طبقه عوض شد ⇒ زمانِ ساخت جدا (loadFloor داخلِ همین update) — بیشینه‌ی تکه در فریم‌های بعد
      floors++; floorT = 0;
      if (run.dungeon.enemies.some((e) => e.isBoss)) bosses++;
      buildMax = Math.max(buildMax, dtU);
      if (floors === 4) { gc(); heap.push(heapMB()); }
    } else {
      floorT += DT;
      if (dtU > upMax) { upMax = dtU; upMaxAt = `f${run.floor} t=${run.time.toFixed(1)}`; }
    }
    if (i % RENDER_EVERY === 0) {
      const baking = !run._floorCache; run._buildSlice = 0;
      const t1 = performance.now(); run.render(r); let dtR = performance.now() - t1;
        if (baking) { if (floors > 1) { buildSliceMax = Math.max(buildSliceMax, run._buildSlice); slices.push(run._buildSlice); } else coldSlice = Math.max(coldSlice, run._buildSlice); dtR -= run._buildSlice; }
      if (run.time > 2 && dtR > rMax) { rMax = dtR; rMaxAt = `f${run.floor} t=${run.time.toFixed(1)}`; }
    }
    // NaN/∞
    if (bad(h.x) || bad(h.y)) nan++;
    for (const e of run.dungeon.enemies) if (bad(e.x) || bad(e.y) || bad(e.hp)) nan++;
    for (const p of run.projs) if (bad(p.x) || bad(p.y)) nan++;
    entMax = Math.max(entMax, run.dungeon.enemies.length + run.dungeon.drops.length);
    fxMax = Math.max(fxMax, (run.fx.parts ? run.fx.parts.length : 0) + (run.fx.floats ? run.fx.floats.length : 0));
    projMax = Math.max(projMax, run.projs.length);
  }
  gc(); heap.push(heapMB());
  const grow = heap.length > 1 ? heap[heap.length - 1] - heap[0] : 0;
  const res = { simSec: Math.round(run.time), floors, bosses, boons, cmd, updateMaxMs: +upMax.toFixed(2), updateMaxAt: upMaxAt,
    renderMaxMs: +rMax.toFixed(2), renderMaxAt: rMaxAt, floorBuildUpdateMs: +buildMax.toFixed(2), floorBuildSliceMaxMs: +buildSliceMax.toFixed(2), floor1ColdSliceMs: +coldSlice.toFixed(2), slices: slices.length, sliceP99Ms: +pct(slices, 0.99).toFixed(2), slicesOver16: slices.filter((v) => v > 16).length,
    entitiesMax: entMax, fxMax, projMax, nan, heapGrowMB: +grow.toFixed(2) };
  if (upMax > 50) fails.push(`دانجن update ${upMax.toFixed(1)}ms > 50`);
  // ساختِ طبقه: p99 تکه‌ها ≤۱۶ms و حداکثر ۱٪ تکه‌ها بالای ۱۶ (اسپایک‌های تکی = Mark-Compactِ GC، با --trace-gc تأیید شد) و هیچ تکه‌ای > ۳۳ms (۲ فریم)
  const over = slices.filter((v) => v > 16).length;
  if (pct(slices, 0.99) > 16 || over > Math.max(1, slices.length * 0.01) || buildSliceMax > 33 || buildMax > 16) fails.push(`ساختِ طبقه: p99=${pct(slices, 0.99).toFixed(1)} max=${buildSliceMax.toFixed(1)} >16:${over}/${slices.length}`);
  if (nan) fails.push(`NaN/∞ دانجن = ${nan}`);
  if (grow > 8) fails.push(`رشدِ حافظه‌ی دانجن ${grow.toFixed(1)}MB`);
  if (floors < 20 && !QUICK) fails.push(`فقط ${floors} طبقه`);
  return res;
}

// ---------------- مزرعه ----------------
function soakFarm() {
  const save = defaultSave();
  save.coins = 5000; Object.assign(save.upgrades, { worker: 2, sprinkler: 2, basket: 2, wSpeed: 2 });
  const app = new App(save);
  const g = new Game({ coins: 5000, inventory: { carrot: 0, wheat: 0, pumpkin: 0 }, selectedCrop: 'carrot', seeds: { carrot: 99, wheat: 99, pumpkin: 99 }, upgrades: {} }, 5, { worker: 2, sprinkler: 1, basket: 1 });
  g.view = { w: 240, h: 160 };
  app.hydrateFarm(g);
  const r = new Raster(240, 160);
  let upMax = 0, rMax = 0, helpMax = 0, nan = 0, fxMax = 0, nights = 0, rains = 0, lastNight = false;
  const heap = [];
  const T = Math.round(FARM_SEC / DT);
  for (let i = 0; i < T; i++) {
    if (i % 60 === 0) { const gx = 4 + ((rnd() * 30) | 0), gy = 4 + ((rnd() * 20) | 0); g.command(gx * TILE + 8, gy * TILE + 8); }
    const t0 = performance.now(); g.update(DT, null); const dtU = performance.now() - t0;
    const t2 = performance.now(); if (i % 30 === 0) app.helperTick(1); const dtH = performance.now() - t2; // دستیارها ۱ث‌ای (مثلِ دانجن/آفلاین)
    if (i > 30) { upMax = Math.max(upMax, dtU); helpMax = Math.max(helpMax, dtH); }
    if (i % (RENDER_EVERY * 4) === 0) { const t1 = performance.now(); g.render(r); const d = performance.now() - t1; if (i > 60) rMax = Math.max(rMax, d); }
    const night = g.dayT > 1500; if (night && !lastNight) nights++; lastNight = night;
    if (i % 300 === 0 && g.dayT > 380 && g.dayT < 440) rains++;
    if (bad(g.hero.x) || bad(g.hero.y)) nan++;
    for (const w of g.workers) if (bad(w.x) || bad(w.y)) nan++;
    fxMax = Math.max(fxMax, g.fx.parts ? g.fx.parts.length : 0);
    if (i === Math.round(600 / DT)) { gc(); heap.push(heapMB()); }
  }
  gc(); heap.push(heapMB());
  const grow = heap[heap.length - 1] - heap[0];
  const res = { simSec: Math.round(FARM_SEC), updateMaxMs: +upMax.toFixed(2), helperTickMaxMs: +helpMax.toFixed(2), renderMaxMs: +rMax.toFixed(2),
    nights, rainSamples: rains, workers: g.workers.length, fxMax, nan, heapGrowMB: +grow.toFixed(2), coins: save.coins };
  if (Math.max(upMax, helpMax) > 50) fails.push(`مزرعه update ${Math.max(upMax, helpMax).toFixed(1)}ms > 50`);
  if (nan) fails.push(`NaN/∞ مزرعه = ${nan}`);
  if (grow > 8) fails.push(`رشدِ حافظه‌ی مزرعه ${grow.toFixed(1)}MB`);
  return res;
}

const t = performance.now();
const dun = soakDungeon();
console.log('دانجن:', JSON.stringify(dun));
const farm = soakFarm();
console.log('مزرعه:', JSON.stringify(farm));
console.log(fails.length ? 'SOAK FAIL — ' + fails.join(' · ') : 'SOAK GREEN', `(${((performance.now() - t) / 1000).toFixed(1)}s)`);
process.exitCode = fails.length ? 1 : 0;
