// art/mob_px.js — S9.4: موب‌های «دست‌پیکسل» (گرگ، گولم، روح، ایمپ) — نقشه‌ی نویسه‌ای در کد، ۱px = ۱px نهایی
// همه رو به راست کشیده می‌شوند (آینه با lm)؛ انیمیشن = جابه‌جاییِ قطعه‌های دستی، نه چرخش/مقیاس ⇒ پیکسل‌ها تمیز می‌مانند.
// رنگ‌ها از پالتِ مستر گرفته می‌شوند (nearestPM) ⇒ مرحله‌ی snap چیزی را جابه‌جا نمی‌کند.
import { MOY, lm, wind, MHEAD } from './monster_parts.js';
import { nearestPM } from './palette_master.js';

const sin = Math.sin, PI = Math.PI;
const hex = (h, a = 255) => { const c = nearestPM(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); return [c[0], c[1], c[2], a]; };
const pal = (o) => { const p = {}; for (const k in o) p[k] = Array.isArray(o[k]) ? hex(...o[k]) : hex(o[k]); return p; };
// نقشه را با گوشه‌ی بالا-چپِ (x,y) نسبت به مبدأ می‌کشد؛ alpha اختیاری برای محوشدن
function blit(g, rows, p, x, y, fade = 1) {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const c = p[row[i]]; if (!c) continue;
      g.px(Math.round(x) + i, Math.round(y) + j, fade < 1 ? [c[0], c[1], c[2], Math.round(c[3] * fade)] : c);
    }
  }
}

// ---------------- گرگ ----------------
const WP = pal({ 1: '#e9dfc6', 2: '#b9ac8c', 3: '#625c49', 4: '#474230', c: '#f2efe4', k: '#141021', r: '#e05050', w: '#f4f1e6', n: '#2a2430' });
const W_BODY = [
  '.....1111.....11111.......',
  '...11222211111222221......',
  '..1222222222222222221111..',
  '.122232222223222222222221.',
  '.2223222222322222222222cc.',
  '.222222222222222222222ccc.',
  '.33222223333333322222ccc..',
  '..333333333....3333ccc....',
  '...3333..........33c......',
];
const W_TAIL = [
  '......1',
  '....112',
  '...1223',
  '..1223.',
  '.1233..',
  '1233...',
  '33.....',
];
const W_HEAD = [
  '.1..1.........',
  '121.21........',
  '1222211.......',
  '12222221111...',
  '1222k22ccccc1.',
  '2222222cccccck',
  '3c222ccccc33..',
  '.3cccc333.....',
  '..333.........',
];
const W_HEAD_BITE = [
  '.1..1.........',
  '121.21........',
  '1222211.......',
  '12222221111...',
  '1222r22ccccc1k',
  '2222222ccccc3.',
  '3c222cnwnwnn..',
  '.3cccnnnnwn...',
  '..333cccc3....',
];
function wolfLeg(g, x, top, fx, fy, near) {
  const a = near ? WP[2] : WP[3], b = near ? WP[3] : WP[4];
  const n = Math.max(1, fy - 1 - top);
  for (let k = 0; k <= n; k++) { const xx = Math.round(x + (fx - x) * k / n); g.px(xx, top + k, a); g.px(xx + 1, top + k, b); }
  g.px(fx, fy - 1, near ? WP.c : WP[3]); g.px(fx + 1, fy - 1, b); g.px(fx + 2, fy - 1, b);
}
function dWolf(r, f) {
  const g = lm(r, f.face);
  let bob = 0, crouch = 0, lunge = 0, bite = 0, dead = 0;
  if (f.state === 'idle') bob = sin(f.time * 2) > 0.3 ? -1 : 0;
  else if (f.state === 'move') bob = Math.round(Math.abs(sin(f.ph * PI * 2)) * -1.4);
  else if (f.state === 'attack') {
    if (f.t < 0.55) crouch = wind(f.t, 0.55);
    else if (f.t < 0.78) { lunge = (f.t - 0.55) / 0.23; bite = 1; }
    else { lunge = 1 - (f.t - 0.78) / 0.22; bite = lunge > 0.6 ? 1 : 0; }
  } else if (f.state === 'die') dead = Math.min(1, f.t * 1.6);
  const bx = Math.round(-crouch * 4 + lunge * 10), by = Math.round(MOY - 17 + bob + crouch * 2 + dead * 8);
  // پاها (دور ← نزدیک)؛ جفت‌های مورب در حرکت
  const L = [[-11, 0.5, 0], [6, 0, 0], [-8, 0, 1], [9, 0.5, 1]];
  if (dead < 0.5) for (const [hx, off, near] of L) {
    let fx = hx + bx + (hx < 0 ? -1 : 1) * crouch * 2, fy = MOY;
    if (f.state === 'move') { const ph = (f.ph + off) % 1; fx = hx + bx + Math.round(sin(ph * PI * 2) * 3); fy = MOY - (ph < 0.5 ? Math.round(sin(ph * PI * 2) * 2) : 0); }
    wolfLeg(g, hx + bx, by + 6, fx, fy, near);
  }
  blit(g, W_TAIL, WP, bx - 17, by - 4 + (f.state === 'move' ? Math.round(sin(f.ph * PI * 4)) : 0) + dead * 3);
  blit(g, W_BODY, WP, bx - 13, by);
  const hd = bite ? W_HEAD_BITE : W_HEAD;
  blit(g, hd, WP, bx + 9, by - 6 + Math.round(crouch * 2) + dead * 3);
  if (dead > 0.4) { g.px(bx + 13, by - 2 + dead * 3, WP.k); g.px(bx + 12, by - 3 + dead * 3, WP.k); g.px(bx + 14, by - 3 + dead * 3, WP.k); }
}

// ---------------- گولم ----------------
const GP = pal({ 1: '#aeb9c8', 2: '#727e96', 3: '#455257', 4: '#3a444c', 5: '#2f353f', m: '#87975c', M: '#667441', e: '#ffe082', E: '#e6b34d' });
const G_HEAD = [
  '...11111....',
  '.1122222211.',
  '122222222224',
  '12eE2222eE24',
  '122222222234',
  '.2233333334.',
  '..444444444.',
];
const G_TORSO = [
  '.mm11111.....111111mm.',
  'mM12222211112222222Mm.',
  '1222222222222222222224',
  '1222322222222223222224',
  '1222232222222232222234',
  '1222222225222222222234',
  '2222222225522222222334',
  '22222222225222222m3334',
  '2233222222222222mM3344',
  '223332222222222223334.',
  '.233333333333333333344',
  '.4433333333333333334455',
  '..44444455555544444455.',
  '...44455.....55444.....',
];
const G_ARM = [
  '.1111..',
  '122222.',
  '1222234',
  '1222334',
  '2m22334',
  'mM22344',
  '2223344',
  '2223344',
  '.233344',
  '.233344',
];
const G_FIST = [
  '.11111..',
  '1222222.',
  '12322324',
  '22322334',
  '23333344',
  '.444444.',
];
const G_LEG = [
  '1222234',
  '1222334',
  '2222334',
  '2m22334',
  '2222334',
  '2223344',
  '2223344',
  '1222334',
  '2223344',
  '2333344',
  '1222224',
  '23333345',
  '.444455.',
];
function dGolem(r, f) {
  const g = lm(r, f.face);
  let bob = 0, raise = 0, slam = 0, dead = 0, step = 0;
  if (f.state === 'move') { step = sin(f.ph * PI * 2); bob = Math.round(-Math.abs(step)); }
  else if (f.state === 'attack') {
    if (f.t < 0.5) raise = wind(f.t, 0.5); else if (f.t < 0.68) { slam = (f.t - 0.5) / 0.18; raise = 1 - slam; } else slam = 1 - (f.t - 0.68) / 0.32;
  } else if (f.state === 'die') dead = Math.min(1, f.t * 1.4);
  const ty = MOY - 36 + bob + Math.round(slam * 2);
  const sink = (k) => Math.round(dead * dead * k);
  // پاها
  for (const [lx, lift] of [[-9, Math.max(0, step)], [2, Math.max(0, -step)]]) { // ستونِ پا تا زیرِ تنه کش می‌آید
    const y0 = ty + 11, foot = MOY - 8 - Math.round(lift * 2) + sink(2);
    for (let y = y0; y < foot; y++) blit(g, [G_LEG[(y - y0) % 4]], GP, lx, y);
    blit(g, G_LEG.slice(-8), GP, lx, foot);
  }
  // دست‌ها: آویزان → بالای سر → کوبیدن
  const armY = ty + 2 - Math.round(raise * 22) + Math.round(slam * 6);
  for (const s of [-1, 1]) {
    const ax = s < 0 ? -17 - Math.round(raise * 3) : 10 + Math.round(raise * 3);
    blit(g, G_ARM, GP, ax + sink(s * 6), armY + sink(10));
    blit(g, G_FIST, GP, ax - 1 + sink(s * 8), armY + 10 + sink(14));
  }
  blit(g, G_TORSO, GP, -11 + sink(-1), ty + sink(6));
  const hy = ty - 6 + Math.round(raise * -1) + sink(16);
  blit(g, G_HEAD, GP, -6 + sink(3), hy);
  if (dead > 0.3) { for (const x of [-4, 3]) { g.px(x, hy + 3, GP[4]); g.px(x + 1, hy + 3, GP[4]); } }
  else if (raise > 0.5 || slam > 0) { g.px(-4, hy + 2, GP.e); g.px(3, hy + 2, GP.e); }
}

// ---------------- روح ----------------
const HP = pal({ 1: '#f2efe4', 2: '#eef2f7', 3: '#aeb9c8', 4: '#6fa3d8', 5: ['#3e6fae', 160], 6: '#727e96', b: '#efa477', s: '#ffffff', m: '#8a2f2f', 7: ['#22496d', 140], k: '#141021', c: '#ffe082' });
const H_BODY = [
  '......111111......',
  '....11s1111111....',
  '...1s1222222111...',
  '..11222222222211..',
  '.1122222222222211.',
  '.1222222222222221.',
  '122222222222222221',
  '122kk2222222kk2221',
  '12kkkk22222kkkk222',
  '12kkkk22222kkkk223',
  '122kk2222222kk2223',
  '2bb22222222222bb23',
  '2222222kmk22222233',
  '222222222222222233',
  '322222222222222333',
  '332222222222223333',
  '333222222222233334',
  '.33332222223333344',
  '.46333333333333644',
  '..4463333333364444',
];
const H_TAIL = [
  ['..44433333334444..', '..4.4433334444.4..', '...4.44.3444.4....', '.....4..44..4.....', '.......7....7.....'],
  ['..44443333334444..', '..44.443334.444...', '.4..444.4344..4...', '....4...4..4......', '......7.....7.....'],
  ['..4444333333444...', '...444.4334.4444..', '..4.4..44.4..4..4.', '.....4..4.......4.', '.....5......5.....'],
];
function dGhost(r, f) {
  const g = lm(r, f.face);
  let y = Math.round(sin(f.time * 2) * 2), dash = 0, rage = 0, fade = 1;
  if (f.state === 'move') y = Math.round(sin(f.time * 3) * 3);
  else if (f.state === 'attack') {
    if (f.t < 0.55) rage = wind(f.t, 0.55); else if (f.t < 0.75) { dash = (f.t - 0.55) / 0.2; rage = 1; } else { rage = 1 - (f.t - 0.75) / 0.25; dash = rage; }
  } else if (f.state === 'die') { fade = 1 - f.t; y = -Math.round(f.t * 16); }
  const x = -9 + Math.round(dash * 10), top = MOY - 48 + y;
  blit(g, H_BODY, HP, x, top, fade);
  blit(g, H_TAIL[Math.floor(f.time * 6) % 3 & 3] || H_TAIL[0], HP, x, top + 20, fade);
  if (rage > 0.4) { for (const ex of [3, 12]) { g.px(x + ex, top + 8, HP.c); g.px(x + ex + 1, top + 9, HP.c); } }
  if (f.state === 'attack' && f.t > 0.55 && f.t < 0.8) blit(g, ['.kkk.', 'kkkkk', '.kkk.'], HP, x + 6, top + 12, fade);
}

// ---------------- ایمپ ----------------
const IP = pal({ 1: '#efa477', 2: '#c94f4f', 3: '#8a2f2f', 4: '#741723', h: '#f2efe4', H: '#b9ac8c', y: '#ffe082', k: '#141021', w: '#f2efe4', v: '#753378', V: '#4c1f60', f: '#ffe082', F: '#e6b34d' });
const I_BODY = [
  '..h.......h..',
  '..Hh.....hH..',
  '...H11111H...',
  '..1122222211.',
  '..122222223..',
  '.12yk222yk23.',
  '.122222222234',
  '..22wkwkw234.',
  '...3222223...',
  '....12223....',
  '...1222223...',
  '..122122223..',
  '..122111223..',
  '..122222233..',
  '...3222233...',
  '....33.33....',
  '....3...3....',
  '...44..44....',
];
const I_WING = [
  ['v.....', 'vv....', 'vVv...', 'vVVv..', '.vVVv.', '..vvVv', '....vv'],
  ['......', 'vv....', 'vVvv..', 'vVVVv.', '.vVVVv', '...vvv', '......'],
];
const I_TAIL = ['....33', '...3..', '..3...', '.3....', '34....', '444...'];
const I_FIRE = [['.f.', 'fFf', '.F.'], ['.F.', 'fff', 'fFf', '.f.']];
function dImp(r, f) {
  const g = lm(r, f.face);
  let hop = 0, cast = 0, dead = 0;
  const flap = Math.floor(f.time * 8) % 2;
  if (f.state === 'idle') hop = sin(f.time * 3) > 0.5 ? -1 : 0;
  else if (f.state === 'move') hop = -Math.round(Math.abs(sin(f.ph * PI * 2)) * 3);
  else if (f.state === 'attack') cast = f.t < 0.6 ? wind(f.t, 0.6) : 1 - (f.t - 0.6) / 0.4;
  else if (f.state === 'die') dead = Math.min(1, f.t * 1.5);
  const x = -6, top = MOY - 34 + hop + Math.round(dead * 6);
  blit(g, I_WING[flap], IP, x - 5, top + 6, 1 - dead);
  blit(g, I_TAIL, IP, x - 4, top + 13);
  blit(g, I_BODY, IP, x, top);
  if (dead > 0.4) { g.px(x + 3, top + 5, IP.k); g.px(x + 8, top + 5, IP.k); }
  if (cast > 0.2) {
    const s = cast > 0.7 ? 1 : 0, fx = x + 12, fy = top + 7 - Math.round(cast * 4);
    blit(g, I_FIRE[s], IP, fx, fy);
    g.px(x + 11, top + 10, IP[2]); g.px(x + 12, top + 9, IP[1]);
  }
}

Object.assign(MHEAD, { wolf: 26, golem: 45 }); // تاجِ نخبه روی سرِ بدنه‌های تازه (۱۰۰−بالاترین+۲)
export const MBODY_PX = { wolf: dWolf, golem: dGolem, ghost: dGhost, imp: dImp };
