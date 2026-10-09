// art/hero_px.js — S9.3: قهرمانِ «دست‌پیکسل» در مقیاسِ نهایی (۱px = ۱px روی صفحه)
// سر/کلاه/تنه/چکمه نقشه‌ی پیکسلیِ دستی‌اند؛ دست و پا نوارهای ۲px با سایه‌ی دستی روی مفاصلِ اسکلت.
// خروجی روی بومِ ۶۴ کشیده و ۲× بزرگ می‌شود تا خط لوله‌ی قبلی (half → rim → outline → lock) بی‌تغییر بماند.
import { C } from './palette_hero.js';

// نویسه → رنگِ پالتِ قهرمان (فقط همین رنگ‌ها ⇒ recolorِ کارگرها و قفلِ پالت کار می‌کند)
const K = {
  H: C.hair, h: C.hairSh, K: C.skinHi, S: C.skin, s: C.skinSh, e: C.out, w: C.shirt,
  Y: C.hatHi, y: C.hat, t: C.hatSh, r: C.scarf, R: C.scarfSh,
  J: C.jacketHi, j: C.jacket, d: C.jacketSh, D: C.jacketDeep, c: C.shirt, x: C.shirtSh,
  b: C.boot, B: C.bootHi, n: C.bootSh, P: C.pantsHi, p: C.pants, q: C.pantsSh,
};
// هر نقشه: { ax, ay } = خانه‌ای که روی نقطه‌ی لنگر می‌نشیند
const M = (ax, ay, rows) => ({ ax, ay, rows });
const HEAD = {
  down: M(3, 4, [
    '.HHHHH.',
    'HHhHhHH',
    'HSKKKSH',
    'SKKKKKS',
    'SeSKSeS',
    'sSSsSSs',
    '.ssSss.',
  ]),
  blinkDown: M(3, 4, [
    '.HHHHH.',
    'HHhHhHH',
    'HSKKKSH',
    'SKKKKKS',
    'SsSKSsS',
    'sSSsSSs',
    '.ssSss.',
  ]),
  up: M(3, 4, [
    '.HHHHH.',
    'HHHHHHH',
    'HHHhHHH',
    'SHHHHHS',
    'sHhHhHs',
    '.hhhhh.',
    '..sSs..',
  ]),
  side: M(3, 4, [
    '.HHHHH..',
    'HHHHHHH.',
    'HHHHSKS.',
    'HHsSKKK.',
    'HhHSKeSK',
    '.hSSSsS.',
    '..sSSs..',
  ]),
  blinkSide: M(3, 4, [
    '.HHHHH..',
    'HHHHHHH.',
    'HHHHSKS.',
    'HHsSKKK.',
    'HhHSKsSK',
    '.hSSSsS.',
    '..sSSs..',
  ]),
};
const HAT = {
  down: M(4, 8, [
    '..YYYYY..',
    '..yYyyt..',
    '..RrrrR..',
    'YYYyyyyyt',
    '.ttttttt.',
  ]),
  up: M(4, 8, [
    '..YYYYY..',
    '..yyyyt..',
    '..RRRRR..',
    'YYyyyyytt',
    '.ttttttt.',
  ]),
  side: M(4, 8, [
    '..YYYYY...',
    '..yYyyyt..',
    '..RrrrrR..',
    '.YYyyyyyYY',
    '..tttttttt',
  ]),
};
const TORSO = {
  down: M(3, 0, [
    '.rRrRr.',
    'JrrRrrd',
    'JjwxjjD',
    'JjwxjjD',
    'JjjYjjd',
    'jjjjjjD',
    'bbBYbbn',
  ]),
  up: M(3, 0, [
    '.rrrrr.',
    'JjjjjjD',
    'JjjdjjD',
    'JjjdjjD',
    'Jjjjjjd',
    'jjjjjjD',
    'bbbbbbn',
  ]),
  side: M(2, 0, [
    'Rrrr.',
    'RJjjd',
    'rJjjD',
    '.JjjD',
    '.Jjjd',
    '.jjjD',
    '.bBbn',
  ]),
};
const BOOT = {
  front: M(1, 1, ['BbB', 'nnn']),
  side: M(1, 1, ['Bbb.', 'nnnn']),
};

function blit(r, m, x, y, flip) {
  const H = m.rows.length;
  for (let j = 0; j < H; j++) {
    const row = m.rows[j], W = row.length;
    for (let i = 0; i < W; i++) {
      const ch = row[i]; if (ch === '.') continue;
      const c = K[ch]; if (!c) continue;
      const px = flip ? x + (W - 1 - m.ax) - i + 0 : x - m.ax + i;
      r.px(px, y - m.ay + j, c);
    }
  }
}
// نوارِ ۲px بین دو مفصل: ستونِ «نزدیکِ نور» روشن، دیگری پایه؛ نوکِ پایین سایه
function limb(r, a, b, cL, cD, cEnd) {
  const x0 = a[0], y0 = a[1], x1 = b[0], y1 = b[1];
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = Math.round(x0 + (x1 - x0) * t - 0.5), y = Math.round(y0 + (y1 - y0) * t);
    r.px(x, y, cL); r.px(x + 1, y, k === n && cEnd ? cEnd : cD);
  }
}
function sideLeg(r, a, k, b, cL, cD) {
  const seg = (p, q) => {
    const y0 = Math.round(p[1]), y1 = Math.round(q[1]), n = Math.max(1, y1 - y0);
    let px = Math.round(p[0] - 0.5);
    for (let y = y0; y <= y1; y++) {
      const tx = Math.round(p[0] + (q[0] - p[0]) * (y - y0) / n - 0.5);
      px += Math.sign(tx - px);                       // حداکثر ۱px جابه‌جایی در هر ردیف
      r.px(px, y, cL); r.px(px + 1, y, cD);
    }
    return px;
  };
  seg(a, k);
  const kx = Math.round(k[0] - 0.5), ky = Math.round(k[1]);
  r.px(kx, ky, cL); r.px(kx + 1, ky, cL); r.px(kx, ky + 1, cL); r.px(kx + 1, ky + 1, cD);
  seg(k, b);
}
const half = (p) => [p[0] / 2, p[1] / 2];

// P = نقاطِ پوز در مقیاسِ ۱۲۸ (mapPts) · layer: 'back' (بازو/پای دور + تنه) یا 'front' (پای نزدیک + سر + کلاه + بازوی نزدیک)
export function drawHeroPx(r, dir, P, layer, o = {}) {
  const side = dir === 'left' || dir === 'right', flip = dir === 'left';
  const kd = side ? 'side' : dir;
  const leg = (L, near) => {
    const hip = half(L.hip), knee = half(L.knee), an = half(L.ankle);
    if (!side) { // جلو/پشت: پای صاف (زانوی بیرون‌زده حلقه‌ی «O» می‌ساخت)
      const ax = hip[0] + Math.max(-1, Math.min(1, an[0] - hip[0])); // S9.9: ساق تقریباً عمودی ⇒ پاها به هم نمی‌رسند (حلقه‌ی «O» در راه‌رفتنِ جلو)
      limb(r, hip, [ax, an[1] - 1], near ? C.pantsHi : C.pants, near ? C.pants : C.pantsSh, C.pantsSh);
      blit(r, BOOT.front, Math.round(ax - 0.5), Math.round(an[1]), flip); return;
    }
    // S9.9: پای کنار — ستونِ ۲px با گامِ حداکثر ۱px در هر ردیف (بی‌دندانه) + کاسه‌ی زانوی ۲×۲ پرکننده
    sideLeg(r, hip, knee, [an[0], an[1] - 1], near ? C.pantsHi : C.pants, near ? C.pants : C.pantsSh);
    blit(r, side ? BOOT.side : BOOT.front, Math.round(an[0] - 0.5), Math.round(an[1]), flip);
  };
  const arm = (A, near) => {
    const sh = half(A.shoulder), el = half(A.elbow), hd = half(A.hand);
    limb(r, sh, el, near ? C.jacketHi : C.jacket, near ? C.jacket : C.jacketSh);
    limb(r, el, hd, near ? C.jacketHi : C.jacket, near ? C.jacket : C.jacketSh);
    const hx = Math.round(hd[0] - 0.5), hy = Math.round(hd[1]);
    r.px(hx, hy, near ? C.skin : C.skinSh); r.px(hx + 1, hy, C.skinSh);
  };
  const nk = half(P.neck), hc = half(P.headC);
  const nx = Math.round(nk[0]), ny = Math.round(nk[1]);
  if (layer === 'back') {
    arm(P.arms.far, false);
    leg(P.legs.far, false);
    const hp = half(P.pelvis), py = Math.round(hp[1]);
    for (let x = -2; x <= 2 - (side ? 1 : 0); x++) { r.px(nx + x, py, C.pants); r.px(nx + x, py + 1, x ? C.pantsSh : C.out); }
    blit(r, TORSO[kd], nx, ny, flip);
  } else {
    leg(P.legs.near, true);
    const hx = Math.round(hc[0]), hy = Math.round(hc[1]);
    const hm = o.blink && kd !== 'up' ? HEAD[kd === 'side' ? 'blinkSide' : 'blinkDown'] : HEAD[kd];
    blit(r, hm, hx, hy, flip);
    if (!o.noHat) blit(r, HAT[kd], hx, hy, flip);
    arm(P.arms.near, true);
  }
}
// بزرگ‌نمایی ۲× (نزدیک‌ترین) روی بومِ ۱۲۸ — نصف‌سازیِ بعدی همین پیکسل‌ها را دقیقاً پس می‌دهد
export function up2(src, dst) {
  const s = src.d, d = dst.d, w = src.w, W = dst.w;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!s[i + 3]) continue;
    for (let k = 0; k < 4; k++) { const j = ((2 * y + (k >> 1)) * W + 2 * x + (k & 1)) * 4; d[j] = s[i]; d[j + 1] = s[i + 1]; d[j + 2] = s[i + 2]; d[j + 3] = s[i + 3]; }
  }
}
