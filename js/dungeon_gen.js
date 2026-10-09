// dungeon_gen.js — سازنده‌ی طبقه‌ی بزرگِ تو‌در‌تو (ن۱۳۹): اتاق‌ها + راهروها + اتاق‌های نقش‌دار + برخوردهای حساب‌شده.
// ورودی: spec طبقه (js/floors/*) — چیدمان (archetype)، اندازه، ویژگی‌های اتاق — و یک seed.
// خروجی: { cols, rows, kind(Uint8), room(Int16: -1 سنگ، -2 راهرو، n اتاق), rooms, links, spawn, stairs, chests, shrine, torches, decor, groups }
// چیدمان‌ها: scatter (پراکنده) · hub (تالارِ مرکزی) · chain (زنجیره‌ی مارپیچ) · ring (حلقه + پره) · grid (شبکه) · twin (دو بال + پل)
export const K_WALL = 0, K_FLOOR = 1, K_WATER = 2, K_PILLAR = 3;

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function generate(spec, seed) {
  const R = rng(seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const W = spec.cols || 128, H = spec.rows || 96;
  const [wMin, wMax] = spec.rw || [12, 22], [hMin, hMax] = spec.rh || [9, 15];
  const rooms = [];
  const fits = (x, y, w, h, gap = 4) => x >= 2 && y >= 3 && x + w <= W - 3 && y + h <= H - 3 &&
    !rooms.some((o) => x < o.x + o.w + gap && x + w + gap > o.x && y < o.y + o.h + gap + 1 && y + h + gap + 1 > o.y);
  const add = (x, y, w, h, role = null) => { const o = { x, y, w, h, id: rooms.length, cx: x + (w >> 1), cy: y + (h >> 1), role, feat: null }; rooms.push(o); return o; };
  const tryAt = (cx, cy, w, h, n = 30, role = null) => { // نزدیکِ نقطه‌ی هدف جا پیدا کن
    for (let i = 0; i < n; i++) { const x = Math.round(cx - w / 2 + (R() - 0.5) * i * 0.8), y = Math.round(cy - h / 2 + (R() - 0.5) * i * 0.6); if (fits(x, y, w, h)) return add(x, y, w, h, role); }
    return null;
  };
  const rw = () => ri(wMin, wMax), rh = () => ri(hMin, hMax);
  const N = spec.rooms || 18, arch = spec.layout || 'scatter';
  const links = [];
  // ---------- جای‌گذاریِ اتاق‌ها ----------
  if (arch === 'hub') {
    const hub = add((W >> 1) - 13, (H >> 1) - 9, 26, 18, 'hub');
    for (let t = 0; t < 1500 && rooms.length < N; t++) { const w = rw(), h = rh(); const x = ri(2, W - w - 3), y = ri(3, H - h - 3); if (fits(x, y, w, h)) add(x, y, w, h); }
    for (const o of rooms) if (o !== hub && Math.hypot(o.cx - hub.cx, (o.cy - hub.cy) * 1.3) < 40) links.push([hub.id, o.id]);
  } else if (arch === 'chain') { // مارپیچِ سطری: چپ→راست، پایین، راست→چپ…
    const cols = spec.chainCols || 5, rowsN = Math.ceil(N / cols), sw = (W - 8) / cols, sh = (H - 8) / rowsN;
    let prev = null;
    for (let r = 0; r < rowsN; r++) for (let c0 = 0; c0 < cols; c0++) {
      const c = r % 2 ? cols - 1 - c0 : c0, o = tryAt(4 + sw * (c + 0.5), 4 + sh * (r + 0.5), Math.min(rw(), sw - 5 | 0), Math.min(rh(), sh - 6 | 0));
      if (o) { if (prev) links.push([prev.id, o.id]); prev = o; }
    }
  } else if (arch === 'ring') {
    const core = add((W >> 1) - 10, (H >> 1) - 7, 20, 14, 'hub'), M = N - 1;
    let first = null, prev = null;
    for (let i = 0; i < M; i++) {
      const a = (i / M) * Math.PI * 2 + R() * 0.2, o = tryAt(W / 2 + Math.cos(a) * (W / 2 - 16), H / 2 + Math.sin(a) * (H / 2 - 12), rw(), rh());
      if (!o) continue; if (prev) links.push([prev.id, o.id]); else first = o; prev = o;
    }
    if (prev && first && prev !== first) links.push([prev.id, first.id]);
    const ringRooms = rooms.filter((o) => o !== core);
    for (let k = 0; k < (spec.spokes || 2) && ringRooms.length; k++) links.push([core.id, ringRooms[Math.floor(k * ringRooms.length / (spec.spokes || 2))].id]);
  } else if (arch === 'grid') {
    const gc = spec.gridCols || 5, gr = spec.gridRows || 4, sw = (W - 8) / gc, sh = (H - 8) / gr, cell = [];
    for (let r = 0; r < gr; r++) for (let c = 0; c < gc; c++) {
      if (R() < (spec.holes ?? 0.1)) { cell.push(null); continue; }
      cell.push(tryAt(4 + sw * (c + 0.5), 4 + sh * (r + 0.5), Math.min(rw(), sw - 5 | 0), Math.min(rh(), sh - 6 | 0)));
    }
    for (let r = 0; r < gr; r++) for (let c = 0; c < gc; c++) {
      const o = cell[r * gc + c]; if (!o) continue;
      const rt = c + 1 < gc && cell[r * gc + c + 1], dn = r + 1 < gr && cell[(r + 1) * gc + c];
      if (rt && R() < 0.62) links.push([o.id, rt.id]); if (dn && R() < 0.62) links.push([o.id, dn.id]);
    }
  } else if (arch === 'twin') {
    const half = N >> 1;
    for (const side of [0, 1]) for (let t = 0; t < 900 && rooms.filter((o) => o.side === side).length < half; t++) {
      const w = rw(), h = rh(), x = side ? ri((W >> 1) + 6, W - w - 3) : ri(2, (W >> 1) - w - 6), y = ri(3, H - h - 3);
      if (fits(x, y, w, h)) add(x, y, w, h).side = side;
    }
  } else { // scatter
    for (let t = 0; t < 1500 && rooms.length < N; t++) { const w = rw(), h = rh(), x = ri(2, W - w - 3), y = ri(3, H - h - 3); if (fits(x, y, w, h)) add(x, y, w, h); }
  }
  // ---------- اتصال: پیوندهای چیدمان + درختِ کمینه (تضمینِ پیوستگی) + حلقه‌های اضافه ----------
  const par = rooms.map((_, i) => i), fd = (i) => (par[i] === i ? i : (par[i] = fd(par[i])));
  const uni = (i, j) => { const a = fd(i), b = fd(j); if (a === b) return false; par[a] = b; return true; };
  for (const [i, j] of links) uni(i, j);
  const E = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    const a = rooms[i], b = rooms[j]; if (arch === 'twin' && a.side !== b.side) continue;
    E.push([Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy), i, j]);
  }
  E.sort((a, b) => a[0] - b[0]);
  for (const [d, i, j] of E) { if (uni(i, j)) links.push([i, j]); else if (R() < (spec.loops ?? 0.06) && d < 44 && !links.some((l) => (l[0] === i && l[1] === j) || (l[0] === j && l[1] === i))) links.push([i, j]); }
  if (arch === 'twin') { // تنها پلِ میانِ دو بال (نزدیک‌ترین جفت)
    let best = null, bd = 1e9;
    for (const a of rooms) for (const b of rooms) if (a.side === 0 && b.side === 1) { const d = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy) * 2; if (d < bd) { bd = d; best = [a.id, b.id]; } }
    if (best) { links.push(best); uni(best[0], best[1]); }
    for (const [d, i, j] of E) if (uni(i, j)) links.push([i, j]);
  }
  // ---------- حک‌کردن ----------
  const kind = new Uint8Array(W * H), room = new Int16Array(W * H).fill(-1);
  for (const o of rooms) {
    const cut = spec.round != null ? spec.round : ri(0, 3);
    const cross = spec.cross && R() < spec.cross; // اتاقِ صلیبی: چهار گوشه‌ی بزرگِ بریده
    const SH = spec.shapes || ['rect'], shp = o.shape = SH[Math.floor(R() * SH.length)], q = Math.floor(R() * 4); // ن۱۴۰: شکلِ اتاق
    for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) {
      const dx = Math.min(x - o.x, o.x + o.w - 1 - x), dy = Math.min(y - o.y, o.y + o.h - 1 - y);
      if (dx + dy < cut) continue;
      if (cross && dx < (o.w / 4 | 0) && dy < (o.h / 4 | 0)) continue;
      if (shp === 'oval' && ((x + 0.5 - o.x - o.w / 2) / (o.w / 2)) ** 2 + ((y + 0.5 - o.y - o.h / 2) / (o.h / 2)) ** 2 > 1.02) continue;
      if (shp === 'L' && (x - o.x < o.w / 2) === (q & 1 ? true : false) && (y - o.y < o.h / 2) === (q & 2 ? true : false) && x !== o.cx && y !== o.cy) continue;
      if (shp === 'ring') { const ax = Math.max(2, (o.w >> 2)), ay = Math.max(2, (o.h >> 2)), dx2 = Math.abs(x - o.cx), dy2 = Math.abs(y - o.cy); // حیاط: ردیفِ ستون‌های توخالی دورِ میانه (ن۱۴۴)
        if (dx2 <= ax && dy2 <= ay && (dx2 === ax || dy2 === ay) && (x + y) % 2 === 0 && dx2 + dy2 > 1) { kind[y * W + x] = K_PILLAR; room[y * W + x] = o.id; continue; } }
      kind[y * W + x] = K_FLOOR; room[y * W + x] = o.id;
    }
  }
  const cw = spec.cw || 2, lt = [];
  const dig = (x, y, L) => { for (let dy = 0; dy < cw; dy++) for (let dx = 0; dx < cw; dx++) { const X = x + dx, Y = y + dy; if (X < 1 || Y < 2 || X >= W - 1 || Y >= H - 1) continue; const k = Y * W + X; if (room[k] === -1) { room[k] = -2; kind[k] = K_FLOOR; L.push(k); } } };
  for (const [i, j] of links) {
    const a = rooms[i], b = rooms[j], L = []; lt.push({ i, j, t: L });
    let x = a.cx, y = a.cy;
    const goX = (tx) => { while (x !== tx) { dig(x, y, L); x += Math.sign(tx - x); } }, goY = (ty) => { while (y !== ty) { dig(x, y, L); y += Math.sign(ty - y); } };
    if (spec.winding && Math.abs(a.cx - b.cx) > 12) { const mx = ri(Math.min(a.cx, b.cx) + 4, Math.max(a.cx, b.cx) - 4); goX(mx); goY(b.cy); goX(b.cx); }
    else if (R() < 0.5) { goX(b.cx); goY(b.cy); } else { goY(b.cy); goX(b.cx); }
    dig(x, y, L);
  }
  // ---------- نقش‌ها: شروع، پله (دورترین)، باس، گنج (بن‌بست‌ها)، محراب ----------
  const deg = rooms.map(() => 0); for (const [i, j] of links) { deg[i]++; deg[j]++; }
  const start = spec.startAt === 'left' ? rooms.reduce((a, b) => (a.cx < b.cx ? a : b)) : spec.startAt === 'top' ? rooms.reduce((a, b) => (a.cy < b.cy ? a : b)) : rooms.reduce((a, b) => (a.cx + a.cy < b.cx + b.cy ? a : b));
  const dist = bfs(kind, W, H, start.cy * W + start.cx);
  const dOf = (o) => dist[o.cy * W + o.cx];
  const end = rooms.reduce((a, b) => (dOf(a) >= dOf(b) ? a : b));
  { const ok = bfs(kind, W, H, start.cy * W + start.cx); for (let k = 0; k < W * H; k++) if (kind[k] === K_FLOOR && ok[k] < 0) { kind[k] = K_WALL; room[k] = -1; } } // ن۱۴۰: جیب‌های جدا (شکل‌های L/حیاط) → دیوار
  start.role = 'start'; end.role = spec.boss ? 'boss' : 'stairs';
  if (spec.boss) for (let g = 6; g >= 2; g--) { // ن۱۴۰: تالارِ باس بزرگ‌تر — تا جایی که به اتاقِ دیگری نخورد
    const nx = end.x - g, ny = end.y - g, nw = end.w + 2 * g, nh = end.h + 2 * g;
    if (nx < 2 || ny < 3 || nx + nw > W - 3 || ny + nh > H - 3) continue;
    if (rooms.some((o) => o !== end && nx < o.x + o.w + 2 && nx + nw + 2 > o.x && ny < o.y + o.h + 2 && ny + nh + 2 > o.y)) continue;
    Object.assign(end, { x: nx, y: ny, w: nw, h: nh });
    for (let y = ny; y < ny + nh; y++) for (let x = nx; x < nx + nw; x++) { const dx = Math.min(x - nx, nx + nw - 1 - x), dy = Math.min(y - ny, ny + nh - 1 - y); if (dx + dy < 3) continue; const k = y * W + x; if (room[k] === -1 || room[k] === -2 || room[k] === end.id) { kind[k] = K_FLOOR; room[k] = end.id; } }
    break;
  }
  const deadEnds = rooms.filter((o) => !o.role && deg[o.id] === 1).sort((a, b) => dOf(b) - dOf(a));
  const nT = spec.treasure ?? 2;
  for (let i = 0; i < nT && i < deadEnds.length; i++) deadEnds[i].role = 'treasure';
  const free = rooms.filter((o) => !o.role);
  if (spec.shrine !== false && free.length) free[Math.floor(R() * free.length)].role = 'shrine';
  // ---------- ویژگیِ اتاق‌ها: ستون‌ها / حوض (طبقِ spec) — در اتاق‌های بزرگِ بی‌نقش یا هاب ----------
  for (const o of rooms) {
    if (o.role === 'start' || o.role === 'treasure') continue;
    const big = o.w >= 14 && o.h >= 10;
    if (o.shape === 'ring' || o.role === 'shrine') { o.feat = o.shape === 'ring' ? 'court' : null; continue; } // حیاط/محراب ستونِ اضافه نمی‌گیرد
    if (big && spec.pillars && R() < spec.pillars) { o.feat = 'pillars';
      for (let y = o.y + 3; y < o.y + o.h - 3; y += 3) for (let x = o.x + 3; x < o.x + o.w - 3; x += 4) if (room[y * W + x] === o.id) kind[y * W + x] = K_PILLAR; }
    else if (big && spec.pools && R() < spec.pools && o.role !== 'boss') { o.feat = 'pool';
      const rx = (o.w >> 2), ry = (o.h >> 2);
      for (let y = o.cy - ry; y <= o.cy + ry; y++) for (let x = o.cx - rx; x <= o.cx + rx; x++) if (((x - o.cx) / rx) ** 2 + ((y - o.cy) / ry) ** 2 <= 1 && room[y * W + x] === o.id) kind[y * W + x] = K_WATER; }
  }
  // ---------- ن۱۴۴: قطعه‌ی مرکزیِ ویژه‌ی طبقه (چاه/آتش/مجسمه/محراب/قفس/درخت/کریستال/سندان/تابوت) — ۲×۲ مسدود ----------
  const cps = [], CP = spec.centre ? [].concat(spec.centre) : [];
  if (CP.length) { let n = spec.centreN ?? 3;
    for (const o of rooms) { if (n <= 0) break; if ((o.feat && o.feat !== 'court') || (o.role && o.role !== 'stairs') || o.w < 12 || o.h < 9) continue;
      const x = o.cx - 1, y = o.cy - 1; let ok = true;
      for (let j = -1; j <= 2 && ok; j++) for (let i = -1; i <= 2; i++) { const k = (y + j) * W + x + i; if (room[k] !== o.id || kind[k] !== K_FLOOR) { ok = false; break; } }
      if (!ok) continue; o.feat = 'centre'; n--; const v = CP[Math.floor(R() * CP.length)];
      for (let q = 0; q < 4; q++) { const k = (y + (q >> 1)) * W + x + (q & 1); kind[k] = K_PILLAR; cps.push({ x: x + (q & 1), y: y + (q >> 1), t: 'cp', v, q }); } } }
  const floorAt = (o, fx, fy) => { // نزدیک‌ترین کفِ آزادِ اتاق به نقطه‌ی کسری
    const tx = Math.round(o.x + 1 + fx * (o.w - 3)), ty = Math.round(o.y + 1 + fy * (o.h - 3));
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (room[y * W + x] === o.id && kind[y * W + x] === K_FLOOR) return { x, y }; }
    return { x: o.cx, y: o.cy };
  };
  const spawn = floorAt(start, 0.5, 0.6), stairs = floorAt(end, 0.85, 0.85);
  const chests = [];
  for (const o of rooms) if (o.role === 'treasure') { chests.push(floorAt(o, 0.35, 0.3)); if (o.w > 14) chests.push(floorAt(o, 0.65, 0.3)); }
  if (spec.boss) chests.push(floorAt(end, 0.15, 0.2));
  const sh = rooms.find((o) => o.role === 'shrine'); const shrine = sh ? floorAt(sh, 0.5, 0.35) : null;
  // مشعل‌ها: روی نمای دیوارِ بالاییِ اتاق‌ها، هر ۴ تایل
  const torches = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (kind[y * W + x] === K_WALL && room[(y + 1) * W + x] >= 0 && kind[(y + 1) * W + x] !== K_WALL && x % 4 === (spec.torchMod ?? 0)) torches.push({ x, y });
  // دکور و برخوردها
  const decor = [];
  for (let k = 0; k < W * H; k++) if (kind[k] === K_FLOOR && room[k] >= 0 && R() < (spec.decor ?? 0.04)) decor.push({ x: k % W, y: (k / W) | 0, v: Math.floor(R() * 9) });
  const groups = [];
  for (const o of rooms) {
    if (o.role === 'start' || o.role === 'boss' || o.role === 'shrine') continue;
    if (o.role !== 'treasure' && R() < (spec.empty ?? 0.25)) continue;
    const area = o.w * o.h, n = Math.max(1, Math.min(6, Math.round((spec.dens || 1) * (1 + area / 110) + (o.role === 'treasure' ? 1 : 0))));
    const g = { room: o.id, spots: [] };
    for (let i = 0; i < n; i++) g.spots.push(floorAt(o, 0.25 + 0.5 * R(), 0.25 + 0.5 * R()));
    groups.push(g);
  }
  const bossAt = spec.boss ? floorAt(end, 0.5, 0.45) : null;
  // ---------- آرایشِ اتاق‌ها (فقط نقاشی، روی راه‌رفتن اثر ندارد): فرش، موزاییک، طلا، آوار، خزه، استخوان، چاله‌آب، پرچم ----------
  const dress = [], isF = (x, y) => kind[y * W + x] === K_FLOOR, rid = (x, y) => room[y * W + x];
  const put = (x, y, t, v = 0) => { if (x > 0 && y > 0 && x < W && y < H && isF(x, y)) dress.push({ x, y, t, v }); };
  const banners = (o, every) => { for (let x = o.x; x < o.x + o.w; x++) { const y = topY(o, x); if (y > 0 && kind[(y - 1) * W + x] === K_WALL && (x - o.x) % every === 2) dress.push({ x, y: y - 1, t: 'banner', v: o.id % 3 }); } };
  const topY = (o, x) => { for (let y = o.y; y < o.y + o.h; y++) if (rid(x, y) === o.id) return y; return -1; };
  const DR = spec.dress || ['rubble', 'bones', 'moss'];
  for (const c of cps) dress.push(c);
  for (const o of rooms) {
    if (o.role === 'boss') { // فرشِ قرمز از ورودی تا تخت + پرچم + جمجمه‌ها
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.cx - 1; x <= o.cx + 1; x++) if (rid(x, y) === o.id) put(x, y, 'rug', x === o.cx ? 1 : 0);
      banners(o, 3); for (let i = 0; i < 6; i++) { const p = floorAt(o, R(), R() < 0.5 ? 0.05 : 0.95); put(p.x, p.y, 'skull'); }
    } else if (o.role === 'treasure') {
      for (let i = 0; i < 4; i++) { const p = floorAt(o, 0.2 + R() * 0.6, 0.3 + R() * 0.5); put(p.x, p.y, 'gold', i); }
      for (let y = o.cy - 1; y <= o.cy + 1; y++) for (let x = o.cx - 3; x <= o.cx + 3; x++) if (rid(x, y) === o.id) put(x, y, 'rug', y === o.cy ? 1 : 0);
      banners(o, 4);
    } else if (o.role === 'shrine') {
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (rid(x, y) === o.id && kind[y * W + x] === K_PILLAR) kind[y * W + x] = K_FLOOR;
      for (let y = o.cy - 3; y <= o.cy + 3; y++) for (let x = o.cx - 4; x <= o.cx + 4; x++) { const d = Math.hypot((x - o.cx) / 4.2, (y - o.cy) / 3.2); if (d <= 1 && rid(x, y) === o.id) put(x, y, 'mosaic', d < 0.45 ? 1 : 0); }
    } else if (o.role !== 'start' || R() < 0.5) {
      const t = DR[Math.floor(R() * DR.length)], n = Math.round(o.w * o.h * (spec.dressN ?? 0.1));
      for (let i = 0; i < n; i++) { // ۷۰٪ کنارِ دیوارها (طبیعی‌تر)، بقیه پراکنده
        const e = R() < 0.7, side = Math.floor(R() * 4), a = R(), b = R() * 0.1;
        const fx = !e ? R() : side === 0 ? b : side === 1 ? 1 - b : a, fy = !e ? R() : side === 2 ? b : side === 3 ? 1 - b : a;
        const p = floorAt(o, fx, fy); put(p.x, p.y, t, Math.floor(R() * 4)); }
      if (o.feat !== 'pool' && R() < (spec.banners ?? 0.25)) banners(o, 5);
    }
  }
  { const ok = bfs(kind, W, H, spawn.y * W + spawn.x); for (let k = 0; k < W * H; k++) if (kind[k] === K_FLOOR && ok[k] < 0) kind[k] = K_PILLAR; } // جیبِ محصور میانِ ستون‌ها → ستون
  return { cols: W, rows: H, kind, room, rooms, links, lt, spawn, stairs, chests, shrine, torches, decor, groups, bossAt, dress, startId: start.id, endId: end.id, dist: dOf(end) };
}

function bfs(kind, W, H, s) {
  const d = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H); let h = 0, t = 0;
  d[s] = 0; q[t++] = s;
  while (h < t) { const k = q[h++], x = k % W, y = (k / W) | 0;
    for (const n of [k - 1, k + 1, k - W, k + W]) { if (n < 0 || n >= W * H || d[n] >= 0 || kind[n] !== K_FLOOR) continue; if ((n === k - 1 && x === 0) || (n === k + 1 && x === W - 1)) continue; d[n] = d[k] + 1; q[t++] = n; } }
  return d;
}
