// livestock.js — دامداری: آغلِ جنوب‌غربی (با خرید باز می‌شود) + مرغ/گوسفند/گاو که می‌گردند، می‌چرند و
// محصول می‌دهند (تخم/پشم/شیر). جمع‌آوری: نزدیک‌شدنِ قهرمان یا تپ روی آغل. فروش با «فروش همه».
import { TILE } from './tiles.js';
import { animalSprite, goodIcon, drawAnimalShadow } from './art/animals.js';
import { rasterToCanvas } from './raster.js';
import { faNum } from './i18n.js';

// ناحیه‌ی آغل (تایل): حصار دور، داخل = x2..9 · y16..18
export const PEN = { x0: 1, x1: 10, y0: 15, y1: 18, door: 17 }; // در: ضلع شرقی (10,17)
export const inPen = (tx, ty) => tx > PEN.x0 && tx < PEN.x1 && ty > PEN.y0 && ty <= PEN.y1;

// time = ثانیه تا محصول · sell = قیمت هر محصول
export const ANIMALS = {
  chicken: { good: 'egg',  time: 40,  sell: 14, speed: 14, w: 11 },
  sheep:   { good: 'wool', time: 90,  sell: 48, speed: 9,  w: 17 },
  cow:     { good: 'milk', time: 140, sell: 95, speed: 7,  w: 21 },
};
export const GOODS = { egg: 14, wool: 48, milk: 95 };
export const goodsValue = (inv) => { let v = 0; for (const k in GOODS) v += (inv[k] | 0) * GOODS[k]; return v; };

// آغل را روی گرید مهر می‌کند (درخت‌ها پاک، حصار دور) — idempotent
export function stampPen(farm) {
  if (farm.penOn) return;
  farm.penOn = true;
  for (let y = PEN.y0; y <= PEN.y1; y++) for (let x = PEN.x0; x <= PEN.x1; x++) {
    const c = farm.cell(x, y); if (!c) continue;
    const edge = y === PEN.y0 || x === PEN.x0 || x === PEN.x1;
    if (edge && !(x === PEN.x1 && y === PEN.door)) { c.kind = 'fence'; c.farmable = false; }
    else if (c.kind === 'tree' || c.kind === 'fence') { c.kind = 'grass'; c.variant &= 1; }
  }
  for (let y = PEN.y0; y <= PEN.y1; y++) for (let x = PEN.x0; x <= PEN.x1; x++) {
    const c = farm.cell(x, y); if (!c || c.kind !== 'fence') continue;
    const l = farm.cell(x - 1, y), r = farm.cell(x + 1, y);
    c.fenceH = (l && l.kind === 'fence') || (r && r.kind === 'fence');
  }
  for (const [dx, dy] of [[1, 0], [1, -1], [1, 1], [2, 0]]) { const d = farm.cell(PEN.x1 + dx, PEN.door + dy); if (d && d.kind === 'tree') d.kind = 'grass'; } // جلوی در باز بماند
  farm.onAll?.();
}

class Animal {
  constructor(kind, i) {
    this.kind = kind; this.def = ANIMALS[kind];
    this.x = (PEN.x0 + 1.5 + ((i * 3.7) % (PEN.x1 - PEN.x0 - 2))) * TILE;
    this.y = (PEN.y0 + 1.6 + ((i * 1.3) % 2)) * TILE;
    this.face = i % 2 ? -1 : 1; this.tx = this.x; this.ty = this.y;
    this.idleT = Math.random() * 2; this.graze = 0;
    this.prod = this.def.time * (0.3 + Math.random() * 0.5); this.ready = false;
  }
  update(dt) {
    if (!this.ready) { this.prod -= dt; if (this.prod <= 0) this.ready = true; }
    if (this.idleT > 0) { this.idleT -= dt; this.graze = Math.max(0, this.graze - dt); return; }
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { // مقصد بعدی یا ایستادن/چریدن
      this.idleT = 1 + Math.random() * 3; if (Math.random() < 0.6) this.graze = this.idleT;
      this.tx = (PEN.x0 + 1.2 + Math.random() * (PEN.x1 - PEN.x0 - 1.4)) * TILE;
      this.ty = (PEN.y0 + 1.5 + Math.random() * (PEN.y1 - PEN.y0 - 0.6)) * TILE;
      return;
    }
    const s = Math.min(d, this.def.speed * dt);
    this.x += (dx / d) * s; this.y += (dy / d) * s;
    if (Math.abs(dx) > 0.5) this.face = dx > 0 ? 1 : -1;
    this.walkT = (this.walkT || 0) + dt;
  }
  render(r, cx, cy, time) {
    const moving = this.idleT <= 0;
    const fr = moving ? (Math.floor(this.walkT * 6) % 2) : (this.graze > 0 && Math.floor(time * 1.5 + this.x) % 3 ? 2 : 0);
    const sp = animalSprite(this.kind, fr, this.face);
    const sx = Math.round(this.x) - (sp.w >> 1) - cx, sy = Math.round(this.y) - sp.h - cy;
    drawAnimalShadow(r, sx + (sp.w >> 1), sy + sp.h, sp.w - 2);
    sp.over(r, sx, sy);
    if (this.ready) { // حباب محصول با بالا-پایینِ آرام (۲ پله)
      const ic = goodIcon(this.def.good), bob = Math.floor(time * 2 + this.x) % 2;
      ic.over(r, sx + (sp.w >> 1) - (ic.w >> 1), sy - ic.h - 2 - bob);
    }
  }
}

export class Livestock {
  constructor() { this.list = []; this._t = 0; }
  // همگام با ارتقاها (خرید = دامِ تازه)
  sync(up, farm) {
    if (up.pen && farm && !farm.penOn) stampPen(farm);
    for (const k of Object.keys(ANIMALS)) {
      const want = up.pen ? (up[k] | 0) : 0;
      let have = this.list.filter((a) => a.kind === k).length;
      while (have < want) this.list.push(new Animal(k, this.list.length)), have++;
    }
  }
  update(dt, game) {
    this.sync(game.toolLvls, game.farm);
    for (const a of this.list) a.update(dt);
    const h = game.hero; // قهرمان داخل یا کنار آغل ⇒ جمع‌آوری
    if (this.list.length && h.x > (PEN.x0) * TILE && h.x < (PEN.x1 + 1) * TILE && h.y > (PEN.y0 - 0.5) * TILE && h.y < (PEN.y1 + 1) * TILE) this.collect(game);
  }
  collect(game) {
    let n = 0;
    for (const a of this.list) if (a.ready) {
      a.ready = false; a.prod = a.def.time;
      game.wallet.inventory[a.def.good] = (game.wallet.inventory[a.def.good] | 0) + 1; n++;
      game.float(a.x, a.y - 22, '+1', 'gold');
    }
    if (n) { if (game.onSfx) game.onSfx('harvest'); if (game.onEvent) game.onEvent('animal', n); }
    return n;
  }
}

// چیپ‌های انبارِ محصولات دامی در داک (ساخت تنبل؛ فقط با تغییر DOM را لمس می‌کند)
let _gk = '';
export function syncGoodsChips(s) {
  const row = document.querySelector('#dockFarm .row.chips'); if (!row) return;
  const key = (s.upgrades.pen | 0) + ':' + Object.keys(GOODS).map((k) => s.inventory[k] | 0).join(',');
  if (key === _gk) return; _gk = key;
  for (const k of Object.keys(GOODS)) {
    let el = document.getElementById('gc-' + k);
    if (!el) {
      el = document.createElement('div'); el.className = 'chip'; el.id = 'gc-' + k;
      const cv = rasterToCanvas(goodIcon(k)); cv.className = 'pico'; cv.style.width = '16px'; cv.style.height = 'auto';
      el.appendChild(cv); el.appendChild(document.createElement('b'));
      const anchor = row.querySelector('.f2:last-of-type'); row.insertBefore(el, anchor ? anchor.nextSibling : null);
    }
    el.style.display = s.upgrades.pen ? '' : 'none';
    el.querySelector('b').textContent = faNum(s.inventory[k] | 0);
  }
}
