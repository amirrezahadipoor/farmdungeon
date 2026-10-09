// dungeon.js — طبقه‌ی دانجن (ن۱۳۹): چیدمانِ بزرگِ تو‌در‌تو از dungeon_gen + طراحیِ هر طبقه در js/floors؛
// هیولاها گروه‌به‌گروه در اتاق‌ها (خانواده‌ی فصل)، باسِ خانواده هر ۵ طبقه، مهِ جنگ (seen/vis).
import { Monster } from './monster.js';
import { generate, K_FLOOR, K_WATER, K_PILLAR } from './dungeon_gen.js';
import { specFor } from './floors/index.js';
import { tierOf, isBossFloor, floorInTier } from './floors/tiers.js';
import { MSTATS } from './monster.js';
import { DEATH_COLORS } from './art/monster_parts.js';
import { Locomotion, GAITS } from './skeleton.js';
import { ACT_DUR } from './art/hero_pose.js';
import { groundSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { Raster } from './raster.js';
import { genExtras, pickEvent } from './floor_extras.js';
import { FX } from './fx.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const floor10 = (f) => isBossFloor(f); // ن۱۳۹: باس هر ۵ طبقه (نامِ قدیمی برای سازگاری)

export class Dungeon {
  // ن۱۳۹: طبقه‌ی بزرگِ تو‌در‌تو — چیدمانِ هر طبقه ثابت (seed = شماره‌ی طبقه، طراحیِ دستی در js/floors)،
  // هیولا/نخبه/دکورِ تصادفی با seedِ دور. مه: اتاق تا واردش نشوی دیده نمی‌شود (seen/vis).
  constructor(seed, floor) {
    this.seed = seed; this.floor = floor; this.big = true;
    this.rng = mulberry32(seed * 7919 + floor * 104729);
    this.spec = specFor(floor); this.tier = tierOf(floor);
    const g = generate(this.spec, floor * 92821 + 17);
    genExtras(g, this.spec, floor, this.rng); // ن۱۵۰: تله + اتاقِ مخفی
    this.cols = g.cols; this.rows = g.rows; this.gen = g;
    this.rooms = g.rooms; this.roomMap = g.room;
    this.theme = this.tier.theme;
    this.grid = new Array(g.cols * g.rows);
    const R = this.rng, wv = () => { const u = R(); return u < 0.41 ? 0 : u < 0.82 ? 1 : u < 0.92 ? 2 : 3; };
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
      const k = g.kind[y * g.cols + x];
      this.grid[y * g.cols + x] = { x, y, kind: k === K_FLOOR ? 'dfloor' : k === K_WATER ? 'water' : k === K_PILLAR ? 'pillar' : 'wall', v: k === K_FLOOR ? Math.floor(R() * 3) : k === K_PILLAR ? (R() < 0.35 ? 1 : 0) : wv() };
    }
    this.enemies = []; this.chests = []; this.drops = [];
    this.torches = g.torches; this.spawn = g.spawn; this.stairs = g.stairs;
    this.cell(g.stairs.x, g.stairs.y).kind = 'stairs';
    for (const c of g.chests) this.chests.push({ x: c.x, y: c.y, open: false });
    this.shrine = g.shrine && floor >= 2 ? { x: g.shrine.x * TILE + 8, y: g.shrine.y * TILE + 8, used: false } : null;
    for (const d of g.decor) { const c = this.cell(d.x, d.y); if (c.kind === 'dfloor') { c.kind = 'decor'; c.v = d.v; } }
    this.dress = g.dress; // ن۱۴۰: آرایشِ نقاشی‌شده (فرش/طلا/موزاییک/آوار/پرچم)
    // مه
    this.seen = new Set(); this.vis = new Uint8Array(g.cols * g.rows); this.visVer = 0;
    this.traps = g.traps || []; this.secret = g.secret;
    this._spawnAll();
    this.event = pickEvent(this, R); // ن۱۵۰: رویدادِ تصادفیِ طبقه
    if (this.event && this.event.k === 'greed') for (const e of this.enemies) { e.hp *= 1.25; if (e.maxHp) e.maxHp *= 1.25; }
    this.reveal(g.startId);
  }
  cell(x, y) { return (x < 0 || y < 0 || x >= this.cols || y >= this.rows) ? null : this.grid[y * this.cols + x]; }
  walkable(x, y) { const c = this.cell(x, y); return !!c && (c.kind === 'dfloor' || c.kind === 'stairs' || c.kind === 'decor'); }
  roomAt(x, y) { return (x < 0 || y < 0 || x >= this.cols || y >= this.rows) ? -1 : this.roomMap[y * this.cols + x]; }
  // ورود به اتاق: کلِ اتاق + دیوارهایش + راهروهای طی‌شده (بین دو اتاقِ دیده‌شده) + ۲ تایل از دهانه‌ی بقیه‌ی راهروها
  reveal(id) {
    if (id < 0 || this.seen.has(id)) return false;
    this.seen.add(id);
    const W = this.cols, H = this.rows, V = this.vis, M = this.roomMap, q = [];
    for (let k = 0; k < W * H; k++) if (M[k] === id) { V[k] = 1; q.push(k, 0); }
    for (const L of this.gen.lt) if (this.seen.has(L.i) && this.seen.has(L.j)) for (const k of L.t) V[k] = 1;
    for (let h = 0; h < q.length; h += 2) { const k = q[h], d = q[h + 1]; if (d >= 2) continue;
      for (const n of [k - 1, k + 1, k - W, k + W]) if (n >= 0 && n < W * H && M[n] === -2 && !V[n]) { V[n] = 2; q.push(n, d + 1); } }
    this.visVer++;
    return true;
  }
  // ن۱۵۲: راهرو در لحظه روشن می‌شود — پخشِ BFS روی کاشی‌های راهرو تا ۷ قدم؛ اتاقِ مجاور (≤۱ قدم) کامل کشف می‌شود
  revealNear(tx, ty) {
    const W = this.cols, H = this.rows, M = this.roomMap, V = this.vis, k0 = ty * W + tx; let ch = false, rm = -1;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return -1;
    const q = [k0, 0], seen = new Set([k0]);
    for (let i = 0; i < q.length; i += 2) { const k = q[i], d = q[i + 1];
      if (M[k] === -2 && !V[k]) { V[k] = 1; ch = true; }
      if (M[k] >= 0 && d <= 1 && !this.seen.has(M[k])) rm = M[k];
      if (d >= 7 || (M[k] !== -2 && k !== k0)) continue;
      for (const n of [k - 1, k + 1, k - W, k + W]) if (n >= 0 && n < W * H && !seen.has(n) && M[n] !== -1 && this.walkable(n % W, (n / W) | 0)) { seen.add(n); q.push(n, d + 1); } }
    if (ch) this.visVer++;
    return rm;
  }
  // تایل دیده می‌شود؟ (دیوار: اگر یکی از همسایه‌های کفش دیده شده)
  visible(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return false;
    const W = this.cols; if (this.vis[y * W + x]) return true;
    if (this.roomMap[y * W + x] !== -1) return false;
    for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < this.rows && this.vis[Y * W + X]) return true; }
    return false;
  }
  _spawnAll() {
    const g = this.gen, f = this.floor, T = this.tier, R = this.rng, fi = floorInTier(f);
    const hpMul = 1 + 0.13 * (f - 1), dmgMul = 1 + 0.075 * (f - 1);
    const norm = (k) => ({ hp: Math.pow(20 / MSTATS[k].hp, 0.6), dmg: Math.pow(4 / MSTATS[k].dmg, 0.6) }); // هم‌ترازیِ خانواده‌ها ⇒ قدرت را طبقه تعیین می‌کند، نه نوع
    for (const grp of g.groups) {
      for (const sp of grp.spots) {
        const kind = T.mobs[Math.floor(R() * T.mobs.length)], n = norm(kind);
        const elite = f >= 3 && R() < 0.06 + 0.02 * fi;
        const m = new Monster(kind, sp.x * TILE + 8, sp.y * TILE + 8, 1, { hpMul: hpMul * n.hp, dmgMul: dmgMul * n.dmg, elite });
        m.room = grp.room; this.enemies.push(m);
      }
    }
    if (g.bossAt) { // باسِ مخصوصِ خانواده‌ی همین فصل (طبقه‌ی ۱۰۰: اهریمنِ نهایی)
      const final = f >= 100, kind = T.mobs[0], n = norm(kind); // ن۱۴۰: همیشه باسِ غول‌پیکرِ همان خانواده (۱۰۰: سخت‌تر)
      const b = new Monster(kind, g.bossAt.x * TILE + 8, g.bossAt.y * TILE + 8, 1 + (final ? 1 : 0), { hpMul: hpMul * n.hp * (final ? 16 : 11), dmgMul: dmgMul * n.dmg * (final ? 2.3 : 1.9), lord: true });
      b.room = g.endId; this.enemies.push(b);
      for (let i = 0; i < 2; i++) { const k = T.mobs[i % T.mobs.length], nn = norm(k); const sp = (() => { const tx = g.bossAt.x + (i ? 2 : -2), ty = g.bossAt.y + 1; for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = tx + dx, Y = ty + dy; if (g.kind[Y * g.cols + X] === 1 && g.room[Y * g.cols + X] === g.endId) return { x: X, y: Y }; } return g.bossAt; })(); // ن۱۴۵: نگهبان روی آب/ستون نیفتد
        const e = new Monster(k, sp.x * TILE + 8, sp.y * TILE + 8, 1, { hpMul: hpMul * nn.hp, dmgMul: dmgMul * nn.dmg }); e.room = g.endId; this.enemies.push(e); }
    }
  }
}
