// floor_extras.js — ن۱۵۰ (N3+N4): تله‌ها، اتاقِ مخفی، رویدادهای تصادفیِ طبقه.
// genExtras(g, spec, floor, R): روی خروجیِ dungeon_gen قبل از ساختِ grid — تله و اتاقِ مخفی (دیوارِ ترک‌خورده) اضافه می‌کند.
// pickEvent(D, R): یک رویدادِ اختیاری برای طبقه (کمین / چشمه‌ی شفا / طبقه‌ی طمع).
// extrasUpdate(run, dt): منطقِ زمان‌اجرا (فعال‌شدنِ تله، شکستنِ دیوارِ مخفی، رویدادها). drawExtras(r, run, cx, cy): رسم.
import { TILE } from './art/palette_env.js';
import { paintRows } from './art/dungeon_paint.js';
import { Monster } from './monster.js';
const KF = 1, KW = 0;

// ---------- تولید ----------
export function genExtras(g, spec, floor, R) {
  const W = g.cols, H = g.rows, kind = g.kind, room = g.room;
  const used = new Set([g.spawn, g.stairs, ...g.chests, g.shrine, g.bossAt].filter(Boolean).map((p) => p.y * W + p.x));
  for (const d of g.dress) used.add(d.y * W + d.x); for (const gr of g.groups) for (const p of gr.spots) used.add(p.y * W + p.x);
  // --- اتاقِ مخفی: کنارِ یک اتاقِ معمولی، پشتِ یک دیوارِ چپ/راست/پایین (ترک‌دار) ---
  g.secret = null;
  if (spec.secret !== false && floor >= 2) {
    const cand = g.rooms.filter((o) => !o.role || o.role === 'treasure'); // نه شروع/باس
    for (let tries = 0; tries < 60 && !g.secret && cand.length; tries++) {
      const o = cand[Math.floor(R() * cand.length)], side = Math.floor(R() * 3); // 0 چپ، 1 راست، 2 پایین
      const sw = 7, sh = 5;
      let door, rx, ry;
      if (side === 2) { const x = o.x + 3 + Math.floor(R() * Math.max(1, o.w - 6)); let y = o.y + o.h - 1; while (y > o.y && kind[y * W + x] !== KF) y--; door = { x, y: y + 1 }; rx = x - (sw >> 1); ry = y + 2; }
      else { const y = o.y + 2 + Math.floor(R() * Math.max(1, o.h - 4)); let x = side ? o.x + o.w - 1 : o.x; const dx = side ? -1 : 1; while (x !== o.cx && kind[y * W + x] !== KF) x += dx;
        door = { x: x - dx, y }; rx = side ? x + 2 : x - 1 - sw; ry = y - (sh >> 1); }
      if (kind[door.y * W + door.x] !== KW || room[door.y * W + door.x] !== -1) continue;
      let ok = rx > 2 && ry > 3 && rx + sw < W - 3 && ry + sh < H - 3;
      for (let y = ry - 1; ok && y <= ry + sh; y++) for (let x = rx - 1; x <= rx + sw; x++) if (kind[y * W + x] !== KW || room[y * W + x] !== -1) { ok = false; break; }
      // بینِ در و اتاقِ مخفی (پایین: یک تایل؛ چپ/راست: یک تایل) باید سنگ باشد ⇒ در = خودِ همان تایلِ دیوار، پشتش کفِ اتاق
      if (!ok) continue;
      const id = g.rooms.length, o2 = { x: rx, y: ry, w: sw, h: sh, id, cx: rx + (sw >> 1), cy: ry + (sh >> 1), role: 'secret', feat: null };
      for (let y = ry; y < ry + sh; y++) for (let x = rx; x < rx + sw; x++) { if ((x === rx || x === rx + sw - 1) && (y === ry || y === ry + sh - 1)) continue; kind[y * W + x] = KF; room[y * W + x] = id; }
      // راهروی یک‌تایلی از در تا اتاق (در خودش دیوار می‌ماند تا شکسته شود)
      const lx = side === 2 ? door.x : (side ? door.x + 1 : door.x - 1), ly = side === 2 ? door.y + 1 : door.y;
      if (kind[ly * W + lx] === KW) { kind[ly * W + lx] = KF; room[ly * W + lx] = id; }
      g.rooms.push(o2);
      g.chests.push({ x: o2.cx, y: o2.cy, secret: true });
      for (let i = 0; i < 6; i++) { const x = rx + 1 + Math.floor(R() * (sw - 2)), y = ry + 1 + Math.floor(R() * (sh - 2)); if (x !== o2.cx || y !== o2.cy) g.dress.push({ x, y, t: 'gold', v: i }); }
      g.dress.push({ x: door.x, y: door.y, t: 'secret', v: 0 });
      g.secret = { x: door.x, y: door.y, id, open: false };
    }
  }
  // --- تله‌ها: نیمی در راهروها، نیمی در اتاق‌ها (نه اتاقِ شروع/باس/مخفی) ---
  const n = spec.traps ?? Math.min(16, 3 + Math.floor(floor / 7)), types = ['spike'];
  if (floor >= 8) types.push('tar'); if (floor >= 16) types.push('fire', 'spike');
  const traps = []; let guard = 0;
  while (traps.length < n && guard++ < 4000) {
    const k = Math.floor(R() * W * H), rid = room[k];
    if (kind[k] !== KF || used.has(k)) continue;
    if (rid >= 0) { const o = g.rooms[rid]; if (!o || o.role === 'start' || o.role === 'boss' || o.role === 'secret') continue; if (R() < 0.5) continue; }
    else if (rid !== -2) continue;
    used.add(k); traps.push({ x: k % W, y: (k / W) | 0, t: types[Math.floor(R() * types.length)], off: R() * 3, hitT: 0 });
  }
  g.traps = traps;
}

export function pickEvent(D, R) {
  if (D.floor < 3 || R() > 0.4) return null;
  const free = D.rooms.filter((o) => !o.role && o.feat !== 'centre' && o.w >= 10);
  const u = R();
  if (u < 0.4 && free.length) { const o = free[Math.floor(R() * free.length)]; return { k: 'ambush', room: o.id, done: false }; }
  if (u < 0.75 && free.length) { const o = free[Math.floor(R() * free.length)]; for (let r = 0; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = o.cx + dx, y = o.cy + dy; if (D.walkable(x, y) && D.roomAt(x, y) === o.id) return { k: 'spring', x, y, used: false }; } return null; }
  return { k: 'greed' };
}

// ---------- زمان‌اجرا ----------
const CYC = { spike: [2.6, 1.9, 2.2], fire: [3.4, 2.4, 2.9] }; // [چرخه، شروعِ هشدار، شروعِ فعال]
export function trapPhase(tp, time) { if (tp.t === 'tar') return 2; const c = CYC[tp.t], p = (time + tp.off) % c[0]; return p >= c[2] ? 2 : p >= c[1] ? 1 : 0; } // ۰ آرام، ۱ هشدار، ۲ فعال
const TRAP_FROM = { kind: 'trap', isBoss: false };

export function extrasUpdate(run, dt) {
  const D = run.dungeon, h = run.hero; if (h.dead) return;
  const tx = Math.floor(h.x / TILE), ty = Math.floor(h.y / TILE);
  for (const tp of D.traps || []) {
    if (tp.hitT > 0) tp.hitT -= dt;
    if (tp.x !== tx || tp.y !== ty) continue;
    if (tp.t === 'tar') { h.chill = Math.max(h.chill || 0, 0.5); continue; }
    if (trapPhase(tp, run.time) === 2 && tp.hitT <= 0 && !(h.dashT > 0)) { // جاخالی از روی تله رد می‌شود
      tp.hitT = 0.9; run._hooks.onHit(TRAP_FROM, (3 + run.floor * 0.45) * (tp.t === 'fire' ? 1.5 : 1));
    }
  }
  // ن۱۵۴: تله‌ها هیولاها را هم می‌زنند (هر فعال‌شدن یک‌بار) — کشاندنِ دشمن روی تله تاکتیک است
  if (D.traps && D.traps.length) for (const e of D.enemies) {
    if (e.dead || e.state === 'die' || e.lord || e.alpha < 1) continue;
    const ex = Math.floor(e.x / TILE), ey = Math.floor(e.y / TILE);
    for (let i = 0; i < D.traps.length; i++) { const tp = D.traps[i]; if (tp.x !== ex || tp.y !== ey || tp.t === 'tar' || trapPhase(tp, run.time) !== 2) continue;
      const cid = i * 100000 + Math.floor((run.time + tp.off) / CYC[tp.t][0]); if (e._tc === cid) break; e._tc = cid;
      const d = Math.round((6 + run.floor * 0.9) * (tp.t === 'fire' ? 1.5 : 1)); e.hurt(d); run.fx.float(e.x, e.y - 46, '-' + d, 'hit'); break; }
  }
  // دیوارِ مخفی: کنارش بایست (۰٫۷ث) یا به آن ضربه بزن ⇒ فرو می‌ریزد
  const S = D.secret;
  if (S && !S.open) {
    const near = Math.hypot(h.x - (S.x * TILE + 8), h.y - (S.y * TILE + 8)) < 24;
    S.t = near ? (S.t || 0) + dt * (h.act >= 0 ? 3 : 1) : 0;
    if (S.t > 0.7) openSecret(run);
  }
  const E = D.event;
  if (E && E.k === 'spring' && !E.used && Math.hypot(h.x - (E.x * TILE + 8), h.y - (E.y * TILE + 8)) < 14) {
    E.used = true; h.hp = run.maxHp; run.fx.float(h.x, h.y - 46, '+' + Math.round(run.maxHp), 'heal'); run.log.push({ k: 'event', id: 'spring' });
  }
}
export function onRoomReveal(run, id) { // کمین: ورود به اتاقِ نشانه‌دار ⇒ سه نخبه دورِ قهرمان
  const D = run.dungeon, E = D.event; if (!E || E.k !== 'ambush' || E.done || E.room !== id) return;
  E.done = true; const h = run.hero, kind = D.tier.mobs[0], f = run.floor;
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + Math.random(); let x = h.x + Math.cos(a) * 42, y = h.y + Math.sin(a) * 30;
    if (!D.walkable(Math.floor(x / TILE), Math.floor(y / TILE))) { x = h.x + Math.cos(a) * 18; y = h.y + Math.sin(a) * 14; if (!D.walkable(Math.floor(x / TILE), Math.floor(y / TILE))) { x = h.x; y = h.y; } }
    const e = new Monster(kind, x, y, 1, { hpMul: (1 + 0.13 * (f - 1)) * 0.8, dmgMul: 1 + 0.075 * (f - 1), elite: true }); e.room = id; e.state = 'move'; D.enemies.push(e); run.fx.dust(x, y, 8); }
  run.fx.shake(3, 0.3); run.log.push({ k: 'event', id: 'ambush' });
}
function openSecret(run) {
  const D = run.dungeon, S = D.secret; S.open = true;
  const c = D.cell(S.x, S.y); c.kind = 'dfloor'; c.v = 0; D.gen.kind[S.y * D.cols + S.x] = KF; D.roomMap[S.y * D.cols + S.x] = S.id;
  if (D._dressMap) D._dressMap.delete(S.y * D.cols + S.x);
  D.reveal(S.id);
  if (run._floorCache) paintRows(run._floorCache, D, Math.max(0, S.y - 2), Math.min(D.rows, S.y + 3));
  run.fx.dust(S.x * TILE + 8, S.y * TILE + 8, 16); run.fx.shake(3, 0.25); run.log.push({ k: 'event', id: 'secret' });
}

// ---------- رسم ----------
export function drawExtras(r, run, cx, cy) {
  const D = run.dungeon, time = run.time;
  for (const tp of D.traps || []) {
    const x = tp.x * TILE - cx, y = tp.y * TILE - cy; if (x < -16 || y < -16 || x > r.w || y > r.h || !D.visible(tp.x, tp.y)) continue;
    const ph = trapPhase(tp, time);
    if (tp.t === 'tar') { r.ellipse(x + 8, y + 9, 7, 4, [24, 18, 22, 230]); r.ellipse(x + 7, y + 8, 4, 2, [60, 50, 56, 230]); r.px(x + 5, y + 7, [120, 110, 120, 255]); continue; }
    if (tp.t === 'spike') {
      r.rect(x + 2, y + 3, 12, 11, [70, 66, 74, 255]); r.rect(x + 2, y + 3, 12, 1, [110, 106, 116, 255]);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const px = x + 4 + i * 4, py = y + 5 + j * 3;
        if (ph === 2) { r.rect(px, py - 3, 1, 4, [220, 224, 232, 255]); r.px(px, py - 4, [255, 255, 255, 255]); }
        else r.rect(px, py, 1, 1, ph === 1 && (time * 20 | 0) % 2 ? [200, 120, 110, 255] : [30, 26, 34, 255]); }
    } else { // fire vent
      r.rect(x + 3, y + 4, 10, 9, [50, 40, 40, 255]); for (let i = 0; i < 4; i++) r.rect(x + 4, y + 5 + i * 2, 8, 1, [90, 70, 60, 255]);
      if (ph === 1) r.ellipse(x + 8, y + 8, 5, 3, [255, 120, 40, 90 + ((time * 12 | 0) % 2) * 60]);
      if (ph === 2) { const fl = (time * 18 | 0) % 3; r.ellipse(x + 8, y + 2, 5, 9, [230, 80, 30, 230]); r.ellipse(x + 8, y + 4 - fl, 3, 6, [255, 180, 60, 240]); r.ellipse(x + 8, y + 6, 1, 3, [255, 245, 190, 255]); }
    }
  }
  const E = D.event;
  if (E && E.k === 'spring' && D.visible(E.x, E.y)) { const x = E.x * TILE - cx + 8, y = E.y * TILE - cy + 9, p = Math.sin(time * 3);
    r.ellipse(x, y + 1, 9, 5, [40, 50, 70, 255]); r.ellipse(x, y, 8, 4, E.used ? [40, 70, 100, 255] : [70, 170, 230, 255]);
    if (!E.used) { r.ellipse(x - 2, y - 1, 3, 1, [200, 240, 255, 255]); for (let i = 0; i < 3; i++) r.px(x - 4 + i * 4, y - 6 - ((time * 10 + i * 3) % 8), [180, 240, 255, 200 + (p > 0 ? 55 : 0)]); } }
}
