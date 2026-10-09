// art/hero_map.js — S10.4: قهرمانِ «دست‌پیکسل» کامل از نقشه‌های نویسه‌ای (مثلِ boss_px S9.6)، نه اسکلتِ میانگین‌گیری‌شده.
// مقیاسِ نهایی (۱ نویسه = ۱px روی صفحه، بومِ ۶۴ با زمینِ ۳۲،۴۶)؛ قد ۲۹–۳۰px؛ ۳ نما (روبه‌رو/پشت/کنار؛ چپ = آینه‌ی راست).
// بالاتنه (کلاه+سر+تنه) نقشه‌ی ثابت است؛ پاها از جدولِ گامِ ۶ فریمی (dx/بلندی) با ستونِ ۲px و پله‌ی ≤۱px ساخته می‌شوند.
// squash/stretch: BOB = جابه‌جاییِ بالاتنه (+۱ = فشرده در تماس، −۱ = کشیده در گذر) — پاها روی زمین می‌مانند و طولشان عوض می‌شود.
// فقط رنگ‌های palette_hero ⇒ recolorِ کارگرها و قفلِ پالت مثلِ قبل. خروجی: لنگرها (۶۴) برای تجهیزات/ابزار.
import { C } from './palette_hero.js';

const K = {
  H: C.hair, h: C.hairSh, K: C.skinHi, S: C.skin, s: C.skinSh, e: C.out,
  Y: C.hatHi, y: C.hat, t: C.hatSh, r: C.scarf, R: C.scarfSh,
  J: C.jacketHi, j: C.jacket, d: C.jacketSh, D: C.jacketDeep, c: C.shirt, x: C.shirtSh,
  b: C.boot, B: C.bootHi, n: C.bootSh, P: C.pantsHi, p: C.pants, q: C.pantsSh,
};
const HAT_FB = ['....YYYYY....', '...YyyyyyY...', '..trrrrrrrt..', 'tYyyyyyyyyyYt', '.ttttttttttt.'];
// ---- بالاتنه: هر ردیف هم‌عرض؛ ستونِ مرکز = لنگرِ x ----
const UP = {
  down: [...HAT_FB,
    '.HHhHHHHHhHH.', '.HSKKKKKKKSH.', '.SKKKKKKKKKS.', '.SKeKKKKKeKS.', '.SKeKKsKKeKS.', '..sSSSSSSSs..', '....ssSss....',
    '...rrrrrrr...', 'jJJjrRRRrjJJj', 'jJJjjcccjjJJj', 'jJdjjcccjjdJj', 'jJdjjjcjjjdJj', 'jjdjjjjjjjdjj', '..nnnnYnnnn..', '..ddjjjjjdd..'],
  up: [...HAT_FB,
    '.HHHHHHHHHHH.', '.HHHHHHHHHHH.', '.HHHhHHHhHHH.', '.HHhHHHHHhHH.', '.SHHHHHHHHHS.', '..hhhhhhhhh..', '....ssSss....',
    '...rrrrrrr...', 'jJJjjjjjjjJJj', 'jJJjjjjjjjJJj', 'jJdjjdjdjjdJj', 'jJdjjjjjjjdJj', 'jjdjjjjjjjdjj', '..nnnnnnnnn..', '..ddjjjjjdd..'],
  side: ['...YYYY....', '..YyyyyY...', '..trrrrrt..', 'tYyyyyyyyYt', '.tttttttttt',
    '.HHHHHSKK..', '.HHHHSKKKK.', '.HHHsSKKeK.', '.HhHSKKKeKK', '..hSSKKKsK.', '...sSSSSs..', '....sSs....',
    '...rrrrR...', '..djjjjJc..', '..djjjjJc..', '..djjjjJc..', '..djjjjJj..', '..nnnnnYn..', '..ddjjjjd..'],
};
const CX = { down: 6, up: 6, side: 5 };                  // ستونِ مرکزی در هر نما
const HIP = { down: 20, up: 20, side: 19 };              // ردیفِ شروعِ پا (زیرِ دامنِ کت)
const GROUND = 46, OXL = 32, LEG_ROWS = 9;               // پا: ۷ ردیف شلوار + ۲ ردیف چکمه ⇒ قدِ کل ۲۹ (+کشش ۱)
export const MAP_H = HIP.down + LEG_ROWS;                // ۲۹
// ---- گامِ ۶ فریمی: dx پای نزدیک (کنار)، بلندیِ پا، bob بالاتنه ----
const GAIT_DX = [3, 2, -1, -3, -2, 1];
const LIFT = [0, 0, 0, 0, 1, 2];                         // پای نزدیک در فریم‌های ۴–۵ در هواست؛ پای دور با نیم‌دور جابه‌جایی
const BOB = [1, -1, 0, 1, -1, 0];                        // ۰ و ۳ = تماس (فشرده) · ۱ و ۴ = کشش
const IDLE_BOB = [0, 1, 1, 0];
export const HERO_MAP_GAIT = { GAIT_DX, LIFT, BOB, IDLE_BOB };

function rowsAt(r, rows, x0, y0, flip, blink) {
  const w = rows[0].length;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      let ch = row[i];
      if (ch === '.') continue;
      if (blink && ch === 'e') ch = 's';
      const c = K[ch]; if (c) r.px(flip ? x0 + (w - 1 - i) : x0 + i, y0 + j, c);
    }
  }
}
// ستونِ ۲px از (x0,y0) تا (x1,y1) با جابه‌جاییِ حداکثر ۱px در هر ردیف (بی‌دندانه، بی‌شطرنج)
function col2(r, x0, y0, x1, y1, cL, cD) {
  let x = x0; const n = Math.max(1, y1 - y0);
  for (let y = y0; y <= y1; y++) {
    const tx = Math.round(x0 + (x1 - x0) * (y - y0) / n);
    x += Math.sign(tx - x);
    r.px(x, y, cL); r.px(x + 1, y, cD);
  }
  return x;
}
function boot(r, x, y, side, flip) {          // ۲ ردیف: رویه + کف (کنار: پنجه‌ی جلو)
  if (side) {
    const a = flip ? x - 2 : x;
    for (let i = 0; i < 4; i++) { r.px(a + i, y, i === (flip ? 0 : 3) ? C.bootHi : C.boot); r.px(a + i, y + 1, C.bootSh); }
  } else {
    r.px(x, y, C.boot); r.px(x + 1, y, C.bootHi); r.px(x + 2, y, C.boot);
    for (let i = -1; i < 3; i++) r.px(x + i, y + 1, C.bootSh);
  }
}

// o: {dir, frame(0..5), anim:'idle'|'walk'|'run', blink, act:{hand:[x,y]}|null, noHat}
// برمی‌گرداند لنگرها در مختصاتِ ۶۴: headC, neck, pelvis, shoulderN/F, handN/F, ankleN/F
export function drawHeroMap(r, o) {
  const dir = o.dir, side = dir === 'left' || dir === 'right', flip = dir === 'left', kd = side ? 'side' : dir;
  const idle = o.anim === 'idle', f = ((o.frame | 0) % 6 + 6) % 6;
  const run = o.anim === 'run';
  const bob = idle ? IDLE_BOB[f & 3] : BOB[f];
  const up = UP[kd], cx = CX[kd], w = up[0].length;
  const top = GROUND + 1 - (HIP[kd] + LEG_ROWS) + bob;  // ردیفِ کلاه در بوم
  const x0 = OXL - (flip ? w - 1 - cx : cx);
  const hipY = top + HIP[kd];
  // پاها: نزدیک = فریم f، دور = f+3 (نیم‌دور)
  const fN = idle ? 0 : f, fF = idle ? 0 : (f + 3) % 6;
  const sgn = flip ? -1 : 1;
  const legs = [];
  const drawLeg = (ff, near, ox) => {
    const dx = side && !idle ? GAIT_DX[ff] * sgn : 0, lift = idle ? 0 : LIFT[ff] + (run && LIFT[ff] ? 1 : 0);
    const ay = GROUND - 1 - lift;                          // ردیفِ رویه‌ی چکمه
    const hx = OXL + ox, ax = hx + dx;
    const fx = col2(r, hx, hipY, ax, ay - 1, near ? C.pantsHi : C.pants, near ? C.pants : C.pantsSh);
    boot(r, fx, ay, side, flip);
    legs.push([fx + 1, ay + 1]);
  };
  if (side) { drawLeg(fF, false, -1); }
  else { drawLeg(fF, false, dir === 'up' ? 1 : -3); }
  // بازوی دور (کنار): پشتِ تنه
  const shY = top + 13, shXN = OXL + sgn * 1, shXF = OXL - sgn * 1;
  const swing = idle ? 0 : -GAIT_DX[f] * sgn;            // دست مخالفِ پای نزدیک
  let handF = [shXF, shY + 5], handN = [shXN + Math.round(swing * 0.7), shY + 5];
  if (side) {
    const hfx = shXF - Math.round(swing * 0.5);
    col2(r, shXF, shY, hfx, shY + 4, C.jacket, C.jacketSh); r.px(hfx, shY + 5, C.skinSh); r.px(hfx + 1, shY + 5, C.skinSh);
    handF = [hfx + 1, shY + 5];
  }
  rowsAt(r, up, x0, top, flip, o.blink && kd !== 'up');
  if (side) drawLeg(fN, true, -1);
  else drawLeg(fN, true, dir === 'up' ? -3 : 1);
  if (!side) { // دست‌ها کنارِ تنه: تابِ عمودیِ ±۱ مخالفِ گام
    const s1 = idle ? 0 : Math.sign(GAIT_DX[f]), yL = top + 18 + (s1 > 0 ? 1 : 0), yR = top + 18 + (s1 < 0 ? 1 : 0);
    r.px(x0, yL, C.skin); r.px(x0 + 1, yL, C.skinSh); r.px(x0 + w - 2, yR, C.skinSh); r.px(x0 + w - 1, yR, C.skin);
    handN = [x0 + w - 1, yR]; handF = [x0, yL];
  }
  if (side) { // بازوی نزدیک روی تنه (یا دستِ ابزار در حالِ ضربه)
    const tgt = o.act ? o.act.hand : [shXN + Math.round(swing * 0.7), shY + 5];
    const hx = col2(r, shXN, shY, Math.round(tgt[0]), Math.round(tgt[1]) - 1, C.jacketHi, C.jacket);
    r.px(hx, Math.round(tgt[1]), C.skin); r.px(hx + 1, Math.round(tgt[1]), C.skinSh);
    handN = [hx + 1, Math.round(tgt[1])];
  } else if (o.act) {
    const tgt = o.act.hand, sx = x0 + w - 2;
    const hx = col2(r, sx, shY, Math.round(tgt[0]), Math.round(tgt[1]) - 1, C.jacketHi, C.jacket);
    r.px(hx, Math.round(tgt[1]), C.skin); r.px(hx + 1, Math.round(tgt[1]), C.skinSh);
    handN = [hx + 1, Math.round(tgt[1])];
  }
  // headC هم‌تراز با قراردادِ equipment (کلاه از hy−۹ تا hy−۱۲ در ۱۲۸ ⇒ لبه‌ی کلاه ≈ hy/2−۴٫۵)
  return {
    headC: [OXL + (side ? sgn : 0), top + 3 + 4.5], neck: [OXL, top + 12], pelvis: [OXL, hipY],
    shoulderN: [shXN, shY], shoulderF: [shXF, shY], handN, handF,
    ankleN: legs[1] || legs[0], ankleF: legs[0], top,
  };
}
