// art/mob_px2.js — S9.5: موب‌های تیره‌ی «دست‌پیکسل» (خفاش، عنکبوت، دزد، کماندار) — نقشه‌ی نویسه‌ای ۱:۱
// هدف: جدایی از کفِ تیره‌ی دانجن — لبه‌ی بالایی روشن (رنگِ Hi)، چشمِ درخشان، یک رنگِ امضای گرم روی هر بدنه.
import { MOY, lm, wind, MHEAD } from './monster_parts.js';
import { nearestPM } from './palette_master.js';

const sin = Math.sin, PI = Math.PI;
const hex = (h, a = 255) => { const c = nearestPM(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); return [c[0], c[1], c[2], a]; };
const pal = (o) => { const p = {}; for (const k in o) p[k] = hex(o[k]); return p; };
const rev = (rows) => rows.map((s) => [...s].reverse().join(''));
function blit(g, rows, p, x, y, fade = 1) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const c = p[rows[j][i]]; if (!c) continue;
    g.px(Math.round(x) + i, Math.round(y) + j, fade < 1 ? [c[0], c[1], c[2], Math.round(255 * fade)] : c);
  }
}
const fadeOf = (f) => (f.state === 'die' ? Math.max(0, 1 - Math.max(0, f.t - 0.5) * 2) : 1);

// ---------------- خفاش ----------------
const BP = pal({ 1: '#e9dfc6', 2: '#b9ac8c', 3: '#b87852', 4: '#86407f', 5: '#6b4c87', m: '#efa477', M: '#b87852', y: '#ffe082', w: '#f2efe4', r: '#c94f4f' });
const B_BODY = [
  '.1.....1.',
  '.r1...1r.',
  '.2311132.',
  '233333332',
  '23y333y32',
  '333333333',
  '.3w333w3.',
  '.4333334.',
  '..44444..',
  '...4.4...',
];
const B_WING = [ // بال راست؛ چپ = آینه
  ['............', '.........11.', '......1122m.', '...112233mM.', '.1223333mM..', '2333mmmM....', '33mM.MM.....', '4M..........'],
  ['............', '............', '22222.......', '33333221....', '3mmm333321..', '.mMMmm3332..', '..M..MMm32..', '.......M.1..'],
  ['2...........', '32..........', '3m2.........', '3mm32.......', '.mMm332.....', '..MMm3321...', '....MMm321..', '......M..1..'],
];
function dBat(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f);
  let y = MOY - 54 + Math.round(sin(f.time * 5) * 2), x = 0, wf = Math.floor(f.time * 10) % 3;
  if (f.state === 'move') wf = Math.floor(f.ph * 6) % 3;
  if (f.state === 'attack') { if (f.t < 0.5) { y -= Math.round(wind(f.t, 0.5) * 6); wf = 0; } else { const e = Math.min(1, (f.t - 0.5) / 0.25); y += Math.round(e * 22 * (1 - Math.max(0, f.t - 0.75) * 4)); x = Math.round(e * 6); wf = 2; } }
  if (f.state === 'die') { y += Math.round(f.t * f.t * 40); wf = 1; }
  y = Math.min(y, MOY - 10);
  const W = B_WING[wf];
  blit(g, rev(W), BP, x - 16, y - 1, fade);
  blit(g, W, BP, x + 5, y - 1, fade);
  blit(g, B_BODY, BP, x - 4, y - 2, fade);
  if (f.state === 'attack' && f.t > 0.4) { g.px(x - 2, y + 2, BP.w); g.px(x + 2, y + 2, BP.w); }
}

// ---------------- عنکبوت ----------------
const SP = pal({ 1: '#aeb9c8', 2: '#727e96', 3: '#6b4c87', 4: '#57427f', 5: '#423775', r: '#c94f4f', R: '#8a2f2f', y: '#ffe082', l: '#aeb9c8' });
const S_ABD = [
  '....11111....',
  '..112222211..',
  '.12222222221.',
  '1222rr222222.',
  '122rRRr22223.',
  '1222rr222233.',
  '2222222223333',
  '.333222333334',
  '..3333333344.',
  '....44444....',
];
const S_HEAD = [
  '..1111..',
  '.122221.',
  '12yy2y21',
  '22y22y23',
  '23222233',
  '.3RrrR3.',
  '..r..r..',
];
const S_HEAD_A = ['..1111..', '.122221.', '12yy2y21', '22yy2y23', '23222233', '.3R33R3.', '.rr..rr.', '.r....r.'];
function spiderLeg(g, x0, y0, kx, ky, fx, fy, near) {
  const a = near ? SP.l : SP[3], b = near ? SP[2] : SP[4];
  g.line(x0, y0, kx, ky, a); g.line(x0, y0 + 1, kx, ky + 1, b);
  g.line(kx, ky, fx, fy, a); g.px(kx, ky - 1, near ? SP[1] : SP[2]);
}
function dSpider(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f);
  let bob = 0, rear = 0, dead = 0;
  if (f.state === 'idle') bob = sin(f.time * 3) > 0.6 ? -1 : 0;
  if (f.state === 'attack') rear = f.t < 0.55 ? wind(f.t, 0.55) : Math.max(0, 1 - (f.t - 0.55) * 3);
  if (f.state === 'die') dead = Math.min(1, f.t * 2);
  const by = MOY - 15 + bob + Math.round(dead * 4), hx = 6, hy = by + 2 - Math.round(rear * 5);
  if (fade > 0.05) for (let i = 0; i < 4; i++) for (const near of [0, 1]) {
    const ph = f.state === 'move' ? sin((f.ph + i * 0.25 + near * 0.5) * PI * 2) : 0;
    const sx = 1 + i * 2, side = i < 2 ? 1 : -1, reach = [18, 12, -16, -21][i];
    const fx = sx + reach + Math.round(ph * 2) + (near ? 1 : -1), fy = dead ? by + 6 : MOY - (ph > 0 ? Math.round(ph * 2) : 0);
    const kx = sx + Math.round(reach * 0.6), ky = by - 4 - (near ? 0 : 1) + Math.round(dead * 8) - (i === 0 ? Math.round(rear * 6) : 0);
    spiderLeg(g, sx, by + 4, kx, ky, dead ? sx + side * 4 : fx, dead ? by : (i === 0 ? fy - Math.round(rear * 8) : fy), near);
  }
  blit(g, S_ABD, SP, -13, by - 3, fade);
  blit(g, rear > 0.3 ? S_HEAD_A : S_HEAD, SP, hx - 2, hy, fade);
  if (dead > 0.5) { g.px(hx + 1, hy + 2, SP[5]); g.px(hx + 3, hy + 2, SP[5]); }
}

// ---------------- دزد ----------------
const DP = pal({ 1: '#aeb9c8', 2: '#727e96', 3: '#727e96', 4: '#6b4c87', 5: '#423775', s: '#efa477', S: '#b87852', k: '#232248', y: '#ffe082', r: '#c94f4f', R: '#8a2f2f', g: '#e6b34d', b: '#51401f', B: '#60391d', m: '#eef2f7', M: '#aeb9c8' });
const D_BODY = [
  '.....11.....',
  '....1221....',
  '...122221...',
  '..12222221..',
  '..1233332...',
  '..13ksSk32..',
  '..23kyky32..',
  '..23ssss3...',
  '..233kk34...',
  '.1222222231.',
  '1222222222314',
  '12322222233.4',
  '12322222234.',
  '.RrrrgrrR34.',
  '.2322R22234.',
  '.2332223334.',
  '.33332333344',
  '.3333.33334.',
  '..444.4444..',
];
const D_LEG = ['44', 'bb', 'bb', 'bb', 'bB', 'bB', 'bB', 'BBB'];
const D_KNIFE = [['s', 'M', 'm', 'm'], ['sMmm']];
function dBandit(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f);
  let bob = 0, stab = 0, dead = 0, lx = [0, 0];
  if (f.state === 'idle') bob = sin(f.time * 2.2) > 0.4 ? 1 : 0;
  if (f.state === 'move') { const p = sin(f.ph * PI * 2); lx = [Math.round(p * 2), -Math.round(p * 2)]; bob = Math.round(-Math.abs(p)); }
  if (f.state === 'attack') stab = f.t < 0.5 ? -wind(f.t, 0.5) : f.t < 0.7 ? (f.t - 0.5) / 0.2 : 1 - (f.t - 0.7) / 0.3;
  if (f.state === 'die') dead = Math.min(1, f.t * 1.6);
  const top = MOY - 26 + bob + Math.round(dead * 9), x = -6 + Math.round(Math.max(0, stab) * 3);
  if (dead < 0.6) { blit(g, D_LEG, DP, x + 3 + lx[0], MOY - 8, fade); blit(g, D_LEG, DP, x + 7 + lx[1], MOY - 8, fade); }
  blit(g, D_BODY, DP, x, top, fade);
  if (dead < 0.3) {
    const kx = x + 11 + Math.round(stab * 5), ky = top + 11 + (stab < 0 ? -2 : 0);
    if (stab > 0.2) blit(g, D_KNIFE[1], DP, kx, ky, fade); else blit(g, D_KNIFE[0].map((c) => c), DP, kx, ky - 3, fade);
  }
}

// ---------------- کماندارِ اسکلت ----------------
const AP = pal({ 1: '#f2efe4', 2: '#e9dfc6', 3: '#b9ac8c', 4: '#625c49', k: '#141021', e: '#c94f4f', w: '#94643a', W: '#6d4627', s: '#e9dfc6', q: '#7a5532', Q: '#51401f', f: '#c94f4f', h: '#eef2f7' });
const A_BODY = [
  '...1111...',
  '..122221..',
  '.12222223.',
  '.12kk2kk3.',
  '.12ke2ke3.',
  '.1222k223.',
  '..3k2k23..',
  '...3223...',
  '....23....',
  '..122221..',
  '.1.3333.3.',
  '..22222...',
  '.1.3333.3.',
  '..22222...',
  '.1.3333.3.',
  '..22222...',
  '...323....',
  '..23332...',
  '...2.2....',
  '..3...3...',
  '..2...2...',
  '..1...1...',
  '..3...3...',
  '..2...2...',
  '..3...3...',
  '.44...44..',
];
const A_QUIVER = ['.ff', 'fh.', 'qq.', 'qQ.', 'qQ.', 'qQ.', 'QQ.'];
function bow(g, x, y, pull, fade) {
  const W = AP.w, D = AP.W, a = fade < 1 ? (c) => [c[0], c[1], c[2], Math.round(255 * fade)] : (c) => c;
  const arc = [[0, 0], [1, 1], [2, 2], [2, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [2, 9], [2, 10], [1, 11], [0, 12]];
  for (const [dx, dy] of arc) { g.px(x + dx, y + dy, a(W)); g.px(x + dx - 1, y + dy, a(D)); }
  const sx = x - 1 - pull;
  for (let dy = 1; dy < 12; dy++) g.px(dy === 6 ? sx : x - 1 - Math.round(pull * (1 - Math.abs(dy - 6) / 6)), y + dy, a(AP.s));
  if (pull > 1) { for (let i = 0; i < 8; i++) g.px(sx + i, y + 6, a(AP.W)); g.px(sx + 8, y + 6, a(AP.h)); g.px(sx + 8, y + 5, a(AP.h)); g.px(sx, y + 5, a(AP.f)); }
}
function dArcher(r, f) {
  const g = lm(r, f.face), fade = fadeOf(f);
  let bob = 0, pull = 0, dead = 0, step = 0;
  if (f.state === 'idle') bob = sin(f.time * 2) > 0.5 ? 1 : 0;
  if (f.state === 'move') { step = Math.round(sin(f.ph * PI * 2)); bob = -Math.abs(step); }
  if (f.state === 'attack') pull = f.t < 0.55 ? Math.round(wind(f.t, 0.55) * 4) : f.t < 0.62 ? 4 : 0;
  if (f.state === 'die') dead = Math.min(1, f.t * 1.6);
  const top = MOY - 28 + bob + Math.round(dead * 10), x = -5;
  blit(g, A_QUIVER, AP, x - 2, top + 8, fade);
  blit(g, A_BODY, AP, x, top, fade);
  if (step) { g.px(x + 2 + step, MOY - 1, AP[4]); }
  if (dead < 0.4) { bow(g, x + 11, top + 6, pull, fade); g.px(x + 9, top + 12, AP[1]); g.px(x + 10, top + 12, AP[2]); }
}

Object.assign(MHEAD, { bat: 58, spider: 22, bandit: 24, archer: 22 });
export const MBODY_PX2 = { bat: dBat, spider: dSpider, bandit: dBandit, archer: dArcher };
