// merchant.js — تاجرِ دوره‌گرد با گاری: تنها راهِ فروشِ محصولات (کشاورزی + دامی).
// قهرمان یا کارگر محصولات را به او می‌دهند؛ ظرفیتِ روزانه‌اش که پر شد گاری را می‌کشد و می‌رود و
// «روزِ بعد» (روزِ بازی = DAY_LEN ثانیه‌ی playT) برمی‌گردد. وضعیت در save.cart = { sold, away }.
import { TILE } from './tiles.js';
import { DAY_LEN } from './night.js';
import { CROPS } from './farm.js';
import { GOODS } from './livestock.js';
import { FarmWorker } from './farm_worker.js';
import { cartSprite, drawAnimalShadow } from './art/animals.js';
import { statVal } from './rpg.js';

export const CART_CAP = 50;                 // ظرفیتِ خریدِ روزانه (تعداد محصول)
export const CART = { x: 21 * TILE + 8, y: 17 * TILE + 10 }; // جای پارکِ گاری (جنوبِ مسیر، شرقِ خانه)
export const STAND = { x: 20, y: 16 };       // تایلی که فروشنده (قهرمان/کارگر) کنارِ گاری می‌ایستد
const OFF_X = 31 * TILE;                     // بیرونِ نقشه از شرق
export const priceOf = (k) => (CROPS[k] ? CROPS[k].sell : GOODS[k] || 0);
export const sellable = (k) => !!(CROPS[k] || GOODS[k]); // سیب = غذای وعده، فروختنی نیست

export class Merchant {
  constructor(wallet) {
    this.w = wallet;
    if (!wallet.cart || typeof wallet.cart !== 'object') wallet.cart = { sold: 0, away: -1 };
    this.state = wallet.cart.away >= 0 ? 'away' : 'here';
    this.x = this.state === 'here' ? CART.x : OFF_X; this.y = CART.y; this.face = -1;
    this.npc = new FarmWorker(this.x + 16, this.y, 2); this.npc.dir = 'left';
  }
  get left() { return Math.max(0, CART_CAP - this.w.cart.sold); }
  isHere() { return this.state === 'here'; }
  day(game) { return Math.floor(game.time / DAY_LEN); }
  update(dt, game) {
    const c = this.w.cart;
    if (this.state === 'away' && this.day(game) > c.away) { this.state = 'arriving'; c.sold = 0; game.log.push({ k: 'cartBack' }); }
    let vx = 0;
    if (this.state === 'arriving') { vx = -1; if (this.x <= CART.x) { this.x = CART.x; this.state = 'here'; c.away = -1; } }
    else if (this.state === 'leaving') { vx = 1; if (this.x >= OFF_X) { this.x = OFF_X; this.state = 'away'; } }
    const sp = 22;
    if (vx) this.x += vx * sp * dt;
    const n = this.npc; // تاجر گاری را از جلو می‌کشد؛ ایستاده: کنارِ گاری رو به مزرعه
    n.x = this.x + (vx > 0 ? 24 : vx < 0 ? -24 : 23); n.y = this.y + 1;
    n.dir = vx > 0 ? 'right' : 'left';
    n.loco.update(dt, vx ? sp : 0, vx, 0, false);
    if (vx) this.face = vx;
  }
  // فروش؛ keep(k) = چند تا از k نگه داشته شود. خروجی { coins, items, away? }
  sell(game, keep = null) {
    if (!this.isHere()) return { coins: 0, items: 0, away: true };
    const inv = this.w.inventory; let coins = 0, items = 0;
    for (const k in inv) {
      if (!sellable(k)) continue;
      let n = Math.max(0, (inv[k] | 0) - (keep ? keep(k) : 0));
      n = Math.min(n, this.left - items);
      if (n <= 0) continue;
      inv[k] -= n; items += n; coins += n * priceOf(k);
    }
    if (!items) return { coins: 0, items: 0 };
    coins = Math.round(coins * (1 + statVal(this.w, 'trade'))); // RPG: بازاری
    this.w.coins += coins; this.w.cart.sold += items;
    if (this.left <= 0) { this.state = 'leaving'; this.w.cart.away = this.day(game); game.log.push({ k: 'cartFull' }); }
    return { coins, items };
  }
  hit(wx, wy) { return this.state === 'here' && Math.abs(wx - this.x) < 22 && wy > this.y - 28 && wy < this.y + 6; }
  render(r, cx, cy, time) {
    if (this.state === 'away') return;
    const s = cartSprite(this.face);
    const sx = Math.round(this.x) - (s.w >> 1) - cx, sy = Math.round(this.y) - s.h + 4 - cy;
    drawAnimalShadow(r, sx + (s.w >> 1), sy + s.h - 3, s.w - 6);
    s.over(r, sx, sy);
    this.npc.render(r, cx, cy, time);
    if (this.state === 'here') { // نوارِ ظرفیت بالای سایبان (سبز = جای خالی)
      const w = 24, fx = sx + ((s.w - w) >> 1), fy = sy - 4, k = Math.round(w * this.left / CART_CAP);
      r.rect(fx - 1, fy - 1, w + 2, 4, [40, 26, 40, 255]); r.rect(fx, fy, w, 2, [90, 60, 70, 255]); r.rect(fx, fy, k, 2, [140, 210, 90, 255]);
    }
  }
}
