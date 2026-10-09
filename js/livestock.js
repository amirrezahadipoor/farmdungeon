// livestock.js — دامداری: سه آغلِ جدا (مرغدانی / آغلِ گوسفند / طویله‌ی گاو) که فقط بعد از خریدِ کارگر
// در منو ظاهر می‌شوند و فقط بعد از خرید روی نقشه ساخته می‌شوند. سطحِ هر آغل = تعداد دام (۱..۵).
// دام‌ها می‌گردند/می‌چرند و محصول می‌دهند؛ کارگر (یا قهرمان با نزدیک‌شدن) جمع می‌کند. فروش فقط به تاجر.
import { TILE } from './tiles.js';
import { animalSprite, goodIcon, drawAnimalShadow, penBuilding } from './art/animals.js';
import { rasterToCanvas } from './raster.js';
import { faNum } from './i18n.js';

export const ANIMAL_MAX = 5;
// rect = دیوارِ حصار (تایل)، door = دهانه‌ی دیوار، inDoor = تایلِ داخلیِ پشتِ در (ایستگاهِ کارگر)
// bld = تایل‌های ساختمان (مسدود، روی ردیفِ دیوار)
export const PENS = {
  coop: { animal: 'chicken', good: 'egg',  x0: 1,  x1: 4,  y0: 16, y1: 18, door: [3, 16],  inDoor: [3, 17],  bld: [[2, 16]],           out: [3, 15] },
  fold: { animal: 'sheep',   good: 'wool', x0: 4,  x1: 10, y0: 16, y1: 18, door: [8, 16],  inDoor: [8, 17],  bld: [[5, 16], [6, 16]],  out: [8, 15] },
  barn: { animal: 'cow',     good: 'milk', x0: 24, x1: 28, y0: 1,  y1: 7,  door: [25, 7],  inDoor: [25, 6],  bld: [[26, 1], [27, 1]],  out: [25, 8], wallB: true }, // دیوارِ پایین هم دارد (بقیه روی پرچینِ جنوبی)
};
export const PEN_KEYS = Object.keys(PENS);
// time = ثانیه تا محصول · sell = قیمتِ تاجر
export const ANIMALS = {
  chicken: { time: 40,  speed: 12 },
  sheep:   { time: 90,  speed: 8 },
  cow:     { time: 140, speed: 6 },
};
export const GOODS = { egg: 14, wool: 48, milk: 95 };

const isWall = (p, x, y) => (x === p.x0 || x === p.x1 || y === p.y0 || (p.wallB && y === p.y1)) && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1;

// مهرِ آغل روی گرید (idempotent): حصارِ دور، ساختمانِ مسدود، داخل و راهروی جلوی در پاک
export function stampPen(farm, id) {
  farm.pens = farm.pens || {};
  if (farm.pens[id]) return;
  farm.pens[id] = true;
  const p = PENS[id];
  const isBld = (x, y) => p.bld.some(([bx, by]) => bx === x && by === y);
  for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
    const c = farm.cell(x, y); if (!c) continue;
    c.farmable = false;
    if (isBld(x, y)) { c.kind = 'grass'; c.variant &= 1; c.block = true; }
    else if (isWall(p, x, y) && !(x === p.door[0] && y === p.door[1])) c.kind = 'fence';
    else if (c.kind === 'tree' || c.kind === 'fence') { c.kind = 'grass'; c.variant &= 1; }
  }
  // راهرو: ردیفِ جلوی در تا مسیرِ اصلی باز (درخت‌ها برداشته)
  const [ox, oy] = p.out;
  const clr = (x, y) => { const c = farm.cell(x, y); if (c && c.kind === 'tree') { c.kind = 'grass'; c.variant &= 1; } };
  if (oy === 15) for (let x = 1; x <= 13; x++) clr(x, 15); else clr(ox, oy);
  for (const c of farm.grid) if (c.kind === 'fence') { // ریلِ افقی (مثل farm_layout)
    const l = farm.cell(c.x - 1, c.y), r = farm.cell(c.x + 1, c.y);
    c.fenceH = (l && l.kind === 'fence') || (r && r.kind === 'fence');
  }
  farm.onAll?.();
}

class Animal {
  constructor(kind, pen, i) {
    this.kind = kind; this.pen = pen; this.def = ANIMALS[kind];
    const [x, y] = this._spot(i * 0.37 + 0.11, i * 0.61 + 0.23);
    this.x = x; this.y = y; this.tx = x; this.ty = y;
    this.face = i % 2 ? -1 : 1; this.idleT = Math.random() * 2; this.graze = 0; this.walkT = 0;
    this.prod = this.def.time * (0.3 + Math.random() * 0.5); this.ready = false;
  }
  _spot(a, b) { // نقطه‌ی تصادفیِ داخلِ آغل (پیکسل، نقطه‌ی پا)
    const p = this.pen;
    const x = (p.x0 + 1 + 0.3 + (a % 1) * (p.x1 - p.x0 - 1.6)) * TILE;
    const y = (p.y0 + 1 + 0.55 + (b % 1) * (p.y1 - p.y0 - (p.wallB ? 1.75 : 0.75))) * TILE;
    return [x, y];
  }
  update(dt) {
    if (!this.ready) { this.prod -= dt; if (this.prod <= 0) this.ready = true; }
    if (this.idleT > 0) { this.idleT -= dt; this.graze = Math.max(0, this.graze - dt); return; }
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    if (d < 1.5) {
      this.idleT = 1 + Math.random() * 3; if (Math.random() < 0.6) this.graze = this.idleT;
      [this.tx, this.ty] = this._spot(Math.random(), Math.random());
      return;
    }
    const s = Math.min(d, this.def.speed * dt);
    this.x += (dx / d) * s; this.y += (dy / d) * s; this.walkT += dt;
    if (Math.abs(dx) > 0.5) this.face = dx > 0 ? 1 : -1;
  }
  render(r, cx, cy, time) {
    const moving = this.idleT <= 0;
    const fr = moving ? (Math.floor(this.walkT * 6) % 2) : (this.graze > 0 && Math.floor(time * 1.5 + this.x) % 3 ? 2 : 0);
    const sp = animalSprite(this.kind, fr, this.face);
    const sx = Math.round(this.x) - (sp.w >> 1) - cx, sy = Math.round(this.y) - sp.h - cy;
    drawAnimalShadow(r, sx + (sp.w >> 1), sy + sp.h, sp.w - 2);
    sp.over(r, sx, sy);
    if (this.ready) {
      const ic = goodIcon(PENS_BY_ANIMAL[this.kind].good), bob = Math.floor(time * 2 + this.x) % 2;
      ic.over(r, sx + (sp.w >> 1) - (ic.w >> 1), sy - ic.h - 2 - bob);
    }
  }
}
const PENS_BY_ANIMAL = {}; for (const k of PEN_KEYS) PENS_BY_ANIMAL[PENS[k].animal] = PENS[k];

class PenBuilding { // ساختمانِ آغل به‌عنوان موجودیتِ y-sort
  constructor(id) { const p = PENS[id]; this.id = id; const b = p.bld; this.x = b[0][0] * TILE; this.y = (b[0][1] + 1) * TILE - 1; this.w = b.length * TILE; }
  render(r, cx, cy) { const s = penBuilding(this.id); s.over(r, this.x + ((this.w - s.w) >> 1) - cx, this.y + 1 - s.h - cy); }
}

export class Livestock {
  constructor() { this.list = []; this.blds = []; }
  sync(up, farm) {
    for (const id of PEN_KEYS) {
      const want = Math.min(ANIMAL_MAX, up[id] | 0);
      if (want && farm && !(farm.pens && farm.pens[id])) { stampPen(farm, id); }
      if (want && !this.blds.some((b) => b.id === id)) this.blds.push(new PenBuilding(id));
      let have = 0; for (const a of this.list) if (a.pen === PENS[id]) have++;
      while (have < want) this.list.push(new Animal(PENS[id].animal, PENS[id], have++));
    }
  }
  update(dt, game) {
    this.sync(game.toolLvls, game.farm);
    for (const a of this.list) a.update(dt);
    const h = game.hero; // قهرمان کنارِ/داخلِ یک آغل ⇒ جمع‌آوریِ همان آغل
    for (const id of PEN_KEYS) {
      const p = PENS[id];
      if (game.farm.pens && game.farm.pens[id] && h.x > p.x0 * TILE - 8 && h.x < (p.x1 + 1) * TILE + 8 && h.y > p.y0 * TILE - 8 && h.y < (p.y1 + 1) * TILE + 8) this.collect(game, id);
    }
  }
  readyIn(id) { let n = 0; for (const a of this.list) if (a.ready && a.pen === PENS[id]) n++; return n; }
  collect(game, id) {
    let n = 0;
    for (const a of this.list) if (a.ready && a.pen === PENS[id]) {
      a.ready = false; a.prod = a.def.time;
      const g = PENS[id].good;
      game.wallet.inventory[g] = (game.wallet.inventory[g] | 0) + 1; n++;
      game.float(a.x, a.y - 22, '+1', 'gold');
    }
    if (n) { if (game.onSfx) game.onSfx('harvest'); if (game.onEvent) game.onEvent('animal', n); }
    return n;
  }
  // برای y-sortِ رندر: ساختمان‌ها + دام‌ها
  drawables() { return this.blds.concat(this.list); }
}

// چیپ‌های انبارِ محصولاتِ دامی در داک (فقط برای آغل‌های خریده‌شده)
let _gk = '';
export function syncGoodsChips(s) {
  const row = document.querySelector('#dockFarm .row.chips'); if (!row) return;
  const key = PEN_KEYS.map((id) => (s.upgrades[id] | 0) + '/' + (s.inventory[PENS[id].good] | 0)).join(',');
  if (key === _gk) return; _gk = key;
  for (const id of PEN_KEYS) {
    const k = PENS[id].good;
    let el = document.getElementById('gc-' + k);
    if (!el) {
      el = document.createElement('div'); el.className = 'chip'; el.id = 'gc-' + k;
      const cv = rasterToCanvas(goodIcon(k)); cv.className = 'pico'; cv.style.width = '16px'; cv.style.height = 'auto';
      el.appendChild(cv); el.appendChild(document.createElement('b'));
      const anchor = row.querySelector('.f2:last-of-type'); row.insertBefore(el, anchor ? anchor.nextSibling : null);
    }
    el.style.display = s.upgrades[id] ? '' : 'none';
    el.querySelector('b').textContent = faNum(s.inventory[k] | 0);
  }
}
