// art/mob_px3.js — ن۱۴۰: شش خانواده‌ی تازه برای فصل‌های ۱۵..۲۰ (بدونِ ترکیب): زامبی، عقرب، قارچ‌گون، مارمولک‌جنگجو، شوالیه‌ی سیاه، اهریمن.
// همان قالبِ mob_px2: نقشه‌ی نویسه‌ای ۱:۱ رو به راست، lm آینه می‌کند؛ لبه‌ی بالای روشن + چشمِ درخشان برای جدایی از کفِ تیره.
import { MOY, lm, wind, MHEAD, DEATH_COLORS } from './monster_parts.js';
import { nearestPM } from './palette_master.js';

const sin = Math.sin, PI = Math.PI;
const hex = (h) => { const c = nearestPM(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); return [c[0], c[1], c[2], 255]; };
const pal = (o) => { const p = {}; for (const k in o) p[k] = hex(o[k]); return p; };
function blit(g, rows, p, x, y, fade = 1) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const c = p[rows[j][i]]; if (!c) continue;
    g.px(Math.round(x) + i, Math.round(y) + j, fade < 1 ? [c[0], c[1], c[2], Math.round(255 * fade)] : c);
  }
}
const fadeOf = (f) => (f.state === 'die' ? Math.max(0, 1 - Math.max(0, f.t - 0.5) * 2) : 1);
// حالتِ مشترکِ دوپا: bob/قدم/خیزِ حمله/افتادن
function pose(f, lunge = 4) {
  let bob = 0, step = 0, dx = 0, dead = 0;
  if (f.state === 'idle') bob = sin(f.time * 2.2) > 0.4 ? 1 : 0;
  if (f.state === 'move') { step = Math.round(sin(f.ph * PI * 2)); bob = -Math.abs(step); }
  if (f.state === 'attack') dx = f.t < 0.5 ? -Math.round(wind(f.t, 0.5) * 2) : f.t < 0.7 ? lunge : 0;
  if (f.state === 'die') dead = Math.min(1, f.t * 1.6);
  return { bob, step, dx, dead };
}

// ---------------- زامبی ----------------
const ZP = pal({ 1: '#b7c79a', 2: '#8fa572', 3: '#62784f', 4: '#3f4f36', s: '#5a7fa8', S: '#3c5778', t: '#2a3d58', p: '#6b5a48', P: '#4a3e32', e: '#ffe082', k: '#141021', r: '#a83a3a' });
const Z_BODY = [
  '...1111....',
  '..122221...',
  '..12k2k3...',
  '..12e2e3...',
  '..22222r...',
  '...3rr3....',
  '....33.....',
  '..ssssss...',
  '.sSssssS1..',
  '.sSsstsS...',
  '..SstsS....',
  '..sSssS....',
  '..SsStS....',
  '..pppppp...',
  '..pPppPp...',
  '..pp..pp...',
  '..pp..pp...',
  '..PP..PP...',
  '..33..33...',
  '.444..444..',
];
const Z_ARM = ['11222', '23333', '3...4'];
function dZombie(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f), p = pose(f, 5);
  const top = MOY - 20 + p.bob + Math.round(p.dead * 9), x = -5 + p.dx;
  blit(g, Z_BODY, ZP, x, top, fade);
  const ay = top + 8 + (f.state === 'attack' && f.t > 0.5 && f.t < 0.7 ? 1 : 0);
  if (p.dead < 0.5) { blit(g, Z_ARM, ZP, x + 8, ay, fade); blit(g, Z_ARM, ZP, x + 7, ay + 2, fade); }
  if (p.step) g.px(x + 3 + p.step, MOY - 1, ZP[4]);
}

// ---------------- عقرب ----------------
const SC = pal({ 1: '#f0c07a', 2: '#d0884a', 3: '#a0582e', 4: '#6a3420', y: '#ffe082', k: '#141021', w: '#f2efe4' });
const SC_BODY = [
  '......1111111......',
  '....11222222211....',
  '..1122223322222....',
  '.122233332233322...',
  'yk222332222332223..',
  'kk333333333333334..',
  '.3443443443443444..',
  '.4.4.4.4.4.4.4.....',
];
const SC_CLAW = ['.111', '1223', '2.33', '.34.'];
function dScorpion(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f);
  let bob = 0, tailUp = 0, dx = 0, dead = 0;
  if (f.state === 'idle') bob = sin(f.time * 3) > 0.6 ? 1 : 0;
  if (f.state === 'move') bob = Math.round(sin(f.ph * PI * 4) * 0.6);
  if (f.state === 'attack') { tailUp = f.t < 0.5 ? Math.round(wind(f.t, 0.5) * 3) : f.t < 0.7 ? -4 : 0; dx = f.t > 0.5 && f.t < 0.7 ? 2 : 0; }
  if (f.state === 'die') dead = Math.min(1, f.t * 1.6);
  const by = MOY - 9 + bob, x = -10 + dx;
  blit(g, SC_BODY, SC, x, by, fade);
  if (dead < 0.6) {
    blit(g, SC_CLAW, SC, x - 4, by + 2, fade); blit(g, SC_CLAW, SC, x - 3, by + 4, fade);
    // دمِ کمانی روی پشت (تا بالای سر)، نیش رو به جلو
    const seg = [[16, 2], [18, 0], [19, -2], [19, -4], [18, -6], [16, -7 - tailUp], [14, -7 - tailUp]];
    for (const [sx, sy] of seg) { g.px(x + sx, by + sy, SC[2]); g.px(x + sx + 1, by + sy, SC[3]); g.px(x + sx, by + sy - 1, SC[1]); }
    const [nx, ny] = seg[seg.length - 1];
    g.px(x + nx - 1, by + ny, SC.k); g.px(x + nx - 2, by + ny + 1, SC.w); g.px(x + nx - 1, by + ny + 1, SC.y);
  }
}

// ---------------- قارچ‌گون ----------------
const SH = pal({ 1: '#f08070', 2: '#d04848', 3: '#a03038', 4: '#6a2030', w: '#f2efe4', b: '#e9dfc6', B: '#b9ac8c', D: '#7d6e55', k: '#141021', e: '#9fe870' });
const SH_CAP = [
  '....111111....',
  '..1122w22211..',
  '.12ww222w2221.',
  '122w2222222w23',
  '1222223ww22233',
  '33333333333344',
  '..4444444444..',
];
const SH_STEM = ['...bbbbb...', '..bkebkeb..', '..bbbbbbB..', '...bbbbB...', '...bbBBB...', '..bb.B.BB..', '..DD...DD..'];
function dShroom(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f), p = pose(f, 3);
  let squash = 0;
  if (f.state === 'attack') squash = f.t < 0.5 ? Math.round(wind(f.t, 0.5) * 2) : 0;
  const top = MOY - 17 + p.bob + squash + Math.round(p.dead * 6), x = -7 + p.dx;
  blit(g, SH_STEM, SH, x + 1, top + 7 - squash, fade);
  blit(g, SH_CAP, SH, x - 1, top, fade);
  if (f.state === 'attack' && f.t > 0.5 && f.t < 0.8) for (let i = 0; i < 5; i++) g.px(x + 2 + i * 3, top - 2 - (i % 2) * 2, SH.e); // ابرِ هاگ
}

// ---------------- مارمولک‌جنگجو ----------------
const LZ = pal({ 1: '#a8e07a', 2: '#6fb04e', 3: '#4a8040', 4: '#2e5634', y: '#ffe9a8', Y: '#d8b860', e: '#ff6a3a', k: '#141021', w: '#94643a', s: '#cfd8e0', l: '#8a5a36' });
const LZ_BODY = [
  '....1111....',
  '...122221...',
  '...12ke22111',
  '...1222222y.',
  '....33222Y..',
  '.....3322...',
  '....l1222...',
  '...ll2yy23..',
  '...l22yY23..',
  '....2yyY3...',
  '....2yY23...',
  '....33233...',
  '....2..2....',
  '...22..23...',
  '...3....3...',
  '..44....44..',
];
const LZ_TAIL = ['...', '..3', '.34', '34.'];
function dLizard(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f), p = pose(f, 6);
  const top = MOY - 16 + p.bob + Math.round(p.dead * 8), x = -6 + p.dx;
  blit(g, LZ_TAIL, LZ, x + 1, top + 10, fade);
  blit(g, LZ_BODY, LZ, x, top, fade);
  if (p.dead < 0.4) { // نیزه: عقب‌کشیدن ⇒ فرو کردن
    const thr = f.state === 'attack' ? (f.t < 0.5 ? -Math.round(wind(f.t, 0.5) * 3) : f.t < 0.7 ? 5 : 0) : 0, sy = top + 8;
    for (let i = -3; i < 12; i++) g.px(x + 4 + i + thr, sy, LZ.w);
    g.px(x + 16 + thr, sy, LZ.s); g.px(x + 17 + thr, sy, LZ.s); g.px(x + 16 + thr, sy - 1, LZ.s); g.px(x + 16 + thr, sy + 1, LZ.s);
  }
  if (p.step) g.px(x + 4 + p.step, MOY - 1, LZ[4]);
}

// ---------------- شوالیه‌ی سیاه ----------------
const KN = pal({ 1: '#8a90a8', 2: '#5a6078', 3: '#3a3e52', 4: '#22232f', r: '#c94f4f', R: '#8a2f2f', e: '#ff5a4a', s: '#dfe6ee', S: '#9aa4b2', g: '#e6c54a' });
const KN_BODY = [
  '....rR....',
  '...rRR....',
  '...1111...',
  '..122221..',
  '..12eee3..',
  '..1222233.',
  '..3233233.',
  '.112222211',
  '1122g22223',
  '1222g22233',
  '.32222223.',
  '..322223..',
  '..133331..',
  '..2333332.',
  '..23..32..',
  '..23..32..',
  '..12..12..',
  '.333..333.',
];
function dKnight(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f), p = pose(f, 4);
  const top = MOY - 18 + p.bob + Math.round(p.dead * 9), x = -5 + p.dx;
  blit(g, KN_BODY, KN, x, top, fade);
  if (p.dead < 0.4) { // شمشیرِ بلند: بالا ⇒ فرود
    const sw = f.state === 'attack' ? (f.t < 0.5 ? wind(f.t, 0.5) : f.t < 0.7 ? -1 : 0) : 0.2;
    const hx = x + 10, hy = top + 9;
    const tx = hx + Math.round(3 + 8 * (1 - Math.abs(sw))), ty = sw < 0 ? hy + 5 : hy - Math.round(12 * sw);
    g.line(hx, hy, tx, ty, KN.s); g.line(hx, hy + 1, tx, ty + 1, KN.S); g.px(hx - 1, hy, KN.g); g.px(hx, hy - 1, KN.g);
  }
}

// ---------------- اهریمن ----------------
const DM = pal({ 1: '#f07858', 2: '#c8402e', 3: '#902828', 4: '#5a1a22', h: '#e9dfc6', H: '#b9ac8c', y: '#ffe082', k: '#141021', w: '#6b2a3a', W: '#3e1826', f: '#ffb040' });
const DM_BODY = [
  '.h......h.',
  '.hH....Hh.',
  '..H1111H..',
  '..122221..',
  '..1yk2yk3.',
  '..1222223.',
  '...3kk33..',
  '...2222...',
  '..122223..',
  '.11222233.',
  '.12f22233.',
  '.122f2233.',
  '..222233..',
  '..32..23..',
  '..32..23..',
  '..33..33..',
  '.444..444.',
];
const DM_WING = ['.......w', '.....wwW', '...wwWW.', '.wwWWW..', 'wWWW....', 'WW......'];
function dDemon(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f), p = pose(f, 5);
  const flap = Math.round(sin(f.time * 6) * 1);
  const top = MOY - 17 + p.bob + Math.round(p.dead * 9), x = -5 + p.dx;
  blit(g, DM_WING.map((s) => [...s].reverse().join('')), DM, x - 6, top + 4 + flap, fade);
  blit(g, DM_WING, DM, x + 8, top + 4 + flap, fade);
  blit(g, DM_BODY, DM, x, top, fade);
  if (f.state === 'attack' && f.t > 0.45 && f.t < 0.75) for (let i = 0; i < 4; i++) g.px(x + 10 + i, top + 9 - (i & 1), DM.f); // پنجه‌ی آتشین
}

Object.assign(MHEAD, { zombie: 22, scorpion: 18, shroom: 19, lizard: 18, knight: 20, demon: 19 });
Object.assign(DEATH_COLORS, {
  zombie: [ZP[1], ZP[2], ZP[3]], scorpion: [SC[1], SC[2], SC[3]], shroom: [SH[1], SH[2], SH.b],
  lizard: [LZ[1], LZ[2], LZ[3]], knight: [KN[1], KN[2], KN[3]], demon: [DM[1], DM[2], DM[3]],
});
export const MBODY_PX3 = { zombie: dZombie, scorpion: dScorpion, shroom: dShroom, lizard: dLizard, knight: dKnight, demon: dDemon };
export const MSHW_PX3 = { zombie: [9, 3], scorpion: [14, 3], shroom: [9, 3], lizard: [9, 3], knight: [10, 3], demon: [11, 3] };
