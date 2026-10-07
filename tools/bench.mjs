// bench.mjs — بنچمارک گلوگاه‌ها: رندر مزرعه (۴ حالت آب‌وهوا) + دانجن + میکرو (over/rect/ellipse)
// S0.4: در پایان، میانه‌ی ۳ اجرای هم‌پروسه برای M11 در tools/baseline.json ذخیره می‌شود (نویز ±۴۰٪ — فقط مقایسه‌ی هم‌پروسه)
import fs from 'node:fs';
import path from 'node:path';
import { Game } from '../js/game.js';
import { Run } from '../js/run.js';
import { Raster } from '../js/raster.js';
import { isRaining } from '../js/art/weather.js';

const W = { coins: 500, inventory: { carrot: 0, wheat: 0, pumpkin: 0 }, selectedCrop: 'carrot' };
const ms = (f, n = 300) => { const t = performance.now(); for (let i = 0; i < n; i++) f(i); return ((performance.now() - t) / n).toFixed(3); };

// --- میکرو ---
const spr = new Raster(128, 128);
for (let i = 0; i < spr.d.length; i += 4) { spr.d[i] = 200; spr.d[i+1] = 100; spr.d[i+2] = 80; spr.d[i+3] = (i / 4 % 7) ? 255 : 120; }
const dst = new Raster(480, 320);
console.log('μ over 128²      :', ms(() => spr.over(dst, 10, 10), 2000) + 'ms');
console.log('μ rect 72×72     :', ms(() => dst.rect(50, 50, 72, 72, [255, 255, 255, 26]), 2000) + 'ms');
console.log('μ ellipse 85×46  :', ms(() => dst.ellipse(240, 160, 85, 46, [16, 20, 40, 22]), 2000) + 'ms');

// --- مزرعه: ۴ حالت ---
for (const [name, dayT] of [['روز صاف(+ابر)', 100], ['باران', 410], ['غروب', 1500], ['شب کامل', 1800]]) {
  const g = new Game(W, 5, {});
  g.view = { w: 480, h: 320 };
  g.dayT = dayT;
  const r = new Raster(480, 320);
  for (let i = 0; i < 60; i++) { g.update(1/60); g.render(r); } // گرم کردن کش‌ها
  const tu = ms((i) => { g.time = i / 60; g.update(1/60); }, 400), tr = ms((i) => g.render(r), 400);
  console.log(`مزرعه ${name.padEnd(12)}:`, tr + "ms رندر + " + tu + "ms آپدیت");
}
// --- موبایل: نما کوچک ---
const gp = new Game(W, 5, {}); gp.view = { w: 195, h: 422 }; gp.dayT = 100;
const rp = new Raster(195, 422);
for (let i = 0; i < 60; i++) { gp.update(1/60); gp.render(rp); }
console.log('مزرعه موبایل 195×422:', ms((i) => { gp.time = i/60; gp.update(1/60); gp.render(rp); }, 400) + 'ms');

// --- دانجن ---
for (const f of [1, 10]) {
  const run = new Run(7, {});
  while (run.floor !== f) run.loadFloor(run.floor + 1);
  const r = new Raster(480, 320);
  run.view = { w: 480, h: 320 };
  for (let i = 0; i < 60; i++) { run.update(1/60); run.render(r); }
  const tu = ms((i) => { run.time = i/60; run.update(1/60); }, 400), tr = ms((i) => run.render(r), 400);
  console.log(`دانجن طبقه ${String(f).padEnd(3)}    :`, tr + 'ms رندر + ' + tu + 'ms آپدیت');
}

// --- M11: میانه‌ی ۳ اجرا (همان پروسه) → tools/baseline.json ---
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[(b.length / 2) | 0]; };
function benchFarm() {
  const g = new Game(W, 5, {}); g.view = { w: 480, h: 320 }; g.dayT = 100;
  const r = new Raster(480, 320);
  for (let i = 0; i < 60; i++) { g.update(1 / 60); g.render(r); }
  return { render: +ms(() => g.render(r), 400), update: +ms((i) => { g.time = i / 60; g.update(1 / 60); }, 400) };
}
function benchDungeon() {
  const run = new Run(7, {}); run.view = { w: 480, h: 320 };
  const r = new Raster(480, 320);
  for (let i = 0; i < 60; i++) { run.update(1 / 60); run.render(r); }
  return { render: +ms(() => run.render(r), 400), update: +ms((i) => { run.time = i / 60; run.update(1 / 60); }, 400) };
}
const F = [0, 1, 2].map(benchFarm), D = [0, 1, 2].map(benchDungeon);
const baseline = {
  ts: new Date().toISOString(),
  note: 'M11 — ms میانه‌ی ۳ اجرا، همان پروسه (480×320)؛ نویز ±۴۰٪ — فقط A/B هم‌دقیقه معتبر است (درس ۱۴)',
  farm: { render: med(F.map((x) => x.render)), update: med(F.map((x) => x.update)) },
  dungeon: { render: med(D.map((x) => x.render)), update: med(D.map((x) => x.update)) },
};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
fs.writeFileSync(path.join(ROOT, 'tools', 'baseline.json'), JSON.stringify(baseline, null, 1));
console.log('M11 baseline → tools/baseline.json:', JSON.stringify(baseline.farm), JSON.stringify(baseline.dungeon));
