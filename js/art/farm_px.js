// art/farm_px.js — S9.7: خانه‌ی مزرعه‌ی دست‌پیکسل (۵۴×۶۰، ~۳٫۵× قدِ قهرمان) + گل‌وگیاهِ دستیِ چمن
// خانه: سقفِ شیروانیِ کاشی‌قرمز (الگوی ردیفی) + قطعه‌های دستی: دودکش، پنجره (روز/شب)، در، جعبه‌گل، فانوس، پله.
// چمن: ۱۰ نقشه‌ی کوچکِ دستی (گل/تافت/سنگ/قارچ/شبدر) با hashِ مختصات در کشِ زمین پخته می‌شوند ⇒ هزینه‌ی فریم صفر.
import { nearestPM } from './palette_master.js';
import { hash2 } from './noise.js';

const hex = (h) => { const c = nearestPM(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); return [c[0], c[1], c[2], 255]; };
const mk = (o) => { const p = {}; for (const k in o) p[k] = hex(o[k]); return p; };
const HP = mk({
  a: '#efa477', r: '#c94f4f', R: '#8a2f2f', d: '#741723',
  w: '#f2efe4', W: '#e9dfc6', v: '#b9ac8c', b: '#7a5532', B: '#51401f',
  s: '#aeb9c8', S: '#727e96', x: '#455257', o: '#94643a', O: '#6d4627',
  g: '#6fa3d8', G: '#3e6fae', h: '#eef2f7', y: '#ffe082', Y: '#e6b34d',
  f: '#ffe082', p: '#c94f4f', q: '#efa477', l: '#477029', L: '#38631e', n: '#141021', k: '#2f353f',
});
const NIGHT = { g: 'y', G: 'Y', h: 'y' };
function blit(r, rows, p, x, y, sub) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    let ch = rows[j][i]; if (sub && sub[ch]) ch = sub[ch];
    const c = p[ch]; if (c) r.px(x + i, y + j, c);
  }
}

const CHIMNEY = ['.ssss.', 'sSSSSx', 'SSxSSx', 'SSSSxx', 'SxSSSx', 'SSSSxx', 'SSSxSx', 'SSSSxx', 'xxxxxx'];
const WINDOW = [
  'BBBBBBBBB',
  'BbbbbbbbB',
  'BbhhGhgbB',
  'BbhgGggbB',
  'BbGGGGGbB',
  'BbhgGggbB',
  'BbggGggbB',
  'BbbbbbbbB',
  'BBBBBBBBB',
  'OooooooOO',
  'OpflqfplO',
  '.lLlLlLl.',
];
const ATTIC = ['..BBB..', '.BbhbB.', 'BbhgGbB', 'BbGGGbB', 'BBBBBBB'];
const DOOR = [
  '..BBBBBBBB..',
  '.BboooooobB.',
  'BboOoooOoobB',
  'BboOoooOoobB',
  'BboOoooOoobB',
  'BbooooooooBB',
  'BboOoooOoobB',
  'BboOoooOyobB',
  'BboOoooOoobB',
  'BboOoooOoobB',
  'BbooooooooBB',
  'BboOoooOoobB',
  'BboOoooOoobB',
  'BboOoooOoobB',
  'BBBBBBBBBBBB',
];
const LANTERN = ['.k.', 'kyk', 'yYy', 'kyk'];
const STEPS = ['.ssssssssssssss.', 'sSSSSSSSSSSSSSSx', 'xxxxxxxxxxxxxxxx'];

// خانه (۲×۲ تایل؛ برخورد دست‌نخورده) — گوشه‌ی تایل (sx,sy)، تصویر از (sx-11, sy-26) تا (sx+43, sy+34)
export function drawHousePx(r, sx, sy, time, night) {
  const X = sx - 10, Y = sy - 26, lit = night > 0.45;
  const P = HP, put = (x, y, c) => r.px(X + x, Y + y, P[c]);
  blit(r, CHIMNEY, P, X + 35, Y + 3);
  // سقف: مثلث از ستیغ (ردیف ۰ در ستون ۲۷) تا لبه‌ی بام (ردیف ۲۲، عرض ۵۴)؛ کاشی ۴×۲ با درزِ یک‌درمیان
  for (let j = 0; j <= 22; j++) {
    const half = Math.round(4 + j * 1.05), x0 = 27 - half, x1 = 26 + half;
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1, ridge = j < 2;
      let c = (j & 1) ? 'r' : ((x + j * 3) % 8 === 0 ? 'R' : 'r'); // کاشیِ پراکنده (درزِ ستونیِ M8 نسازد)
      if (x < 27 && x - x0 < 2) c = 'a';                       // لبه‌ی روشنِ چپ (نور از بالا-چپ)
      if (x > 26 && x1 - x < 3) c = 'R';                       // سایه‌ی شیبِ راست
      if (ridge) c = 'a';
      if (edge) c = 'd';
      if (j === 22) c = x % 3 ? 'd' : 'R';                     // لبه‌ی بام
      put(x, j + 6, c);
    }
  }
  blit(r, ATTIC, P, X + 24, Y + 14, lit ? NIGHT : null);
  // دیوار ۴۴×۲۴ (ستون‌های ۵..۴۸): گچ + اسکلتِ چوبی + سایه‌ی زیرِ بام
  for (let j = 29; j < 53; j++) for (let x = 5; x < 49; x++) {
    let c = x < 7 ? 'v' : x > 46 ? 'v' : 'w';
    if (j === 29 || j === 30) c = 'v';                         // سایه‌ی پیش‌آمدگیِ بام
    if (x === 5 || x === 6 || x === 47 || x === 48) c = x === 6 ? 'B' : 'b';
    if (j === 39 && (x < 14 || x > 40)) c = 'b';               // تیرِ افقی
    if (c === 'w' && ((x * 7 + j * 3) % 23 === 0)) c = 'W';    // بافتِ گچ
    if (j >= 49) c = ((x + (j & 1) * 3) % 6 === 0) ? 'x' : (j === 49 ? 's' : 'S'); // پایه‌ی سنگی
    put(x, j, c);
  }
  blit(r, WINDOW, P, X + 10, Y + 34, lit ? NIGHT : null);
  blit(r, WINDOW, P, X + 35, Y + 34, lit ? NIGHT : null);
  blit(r, DOOR, P, X + 22, Y + 38);
  const lf = Math.floor(time * 2) % 2;
  blit(r, LANTERN, P, X + 33, Y + 39 + 0);
  if (lit && lf) put(34, 43, 'y');
  blit(r, STEPS, P, X + 20, Y + 53);
  // دود ۳ فریمی (آرام)
  const sf = Math.floor(time * 1.2) % 3;
  for (let k = 0; k < 3; k++) { const up = sf * 3 + k * 5; put(37 + ((k + sf) & 1), 2 - up, 'v'); put(38 + ((k + sf) & 1), 3 - up, 'W'); }
}
// پنجره‌های شب (نورِ واقعی پس از تینت) — مختصاتِ شیشه‌ها هم‌خوان با WINDOW/ATTIC
export function drawHouseGlowPx(r, sx, sy, time, k) {
  if (k <= 0.45) return;
  const a = Math.round(Math.min(1, (k - 0.45) / 0.55) * 255), fl = 0.85 + 0.15 * Math.round(Math.sin(time * 2.1) + 1);
  const X = sx - 10, Y = sy - 26, c = [255, 214, 110, Math.round(a * fl)];
  for (const wx of [10, 35]) r.rect(X + wx + 2, Y + 36, 5, 5, c);
  r.rect(X + 26, Y + 16, 3, 2, c);
  r.px(X + 34, Y + 41, [255, 234, 150, Math.round(a * 0.8)]);
  r.rect(X + 22, Y + 53, 10, 1, [255, 234, 150, Math.round(a * 0.25)]);
}
export const HOUSE_BOX = { ox: -10, oy: -26, w: 54, h: 60, base: 58 };

// ---------- گل‌وگیاهِ دستیِ چمن ----------
const FP = mk({
  y: '#ffe082', Y: '#e6b34d', w: '#f2efe4', W: '#e9dfc6', p: '#c94f4f', q: '#efa477', b: '#6fa3d8', u: '#753378',
  g: '#477029', G: '#38631e', h: '#87975c', s: '#aeb9c8', S: '#727e96', x: '#455257', m: '#c94f4f', c: '#e9dfc6', t: '#94643a',
});
const FLORA = [
  ['.w.', 'wyw', '.w.', '.g.'],                 // مینای سفید
  ['.p.', 'pqp', '.p.', '.g.'],                 // گلِ سرخ
  ['.b..', 'bwb.', '.b.u', '.guW', '..g.'],     // گلِ آبی + بنفش
  ['y.y', '.g.', 'Gg.'],                         // دو گلِ زردِ ریز
  ['g...g', '.g.g.', 'hGgGh'],                   // تافتِ بلند
  ['.h.g', 'g.g.', 'GgGg'],                      // تافتِ کوتاه
  ['.ss.', 'sSSx', '.xx.'],                      // سنگ
  ['.s', 'Sx'],                                  // ریگ
  ['.mm.', 'mcmm', '.ct.'],                      // قارچ
  ['g.g', 'GgG', '.G.'],                         // شبدر
];
// تراکم: بیرونِ حصار ۲ قلم، داخلِ زمینِ کشت ۱ قلم با احتمالِ کمتر (خوانایی کشت حفظ می‌شود)
export function bakeFlora(r, tx, ty, sx, sy, field) {
  // خوشه‌ای: میدانِ کم‌بسامد (سلول‌های ۴×۴ تایل) تراکم و «گونه‌ی غالب» هر لکه را تعیین می‌کند ⇒ لکه‌ی گل، نه پاشیدگی
  const cx = tx >> 2, cy = ty >> 2, fx = (tx & 3) / 4, fy = (ty & 3) / 4;
  const lerp = (a, b, t) => a + (b - a) * t;
  const dens = lerp(lerp(hash2(cx, cy, 76), hash2(cx + 1, cy, 76), fx), lerp(hash2(cx, cy + 1, 76), hash2(cx + 1, cy + 1, 76), fx), fy);
  const kind = (hash2(cx, cy, 77) * 4) | 0;                       // ۰..۳ گلِ غالبِ لکه
  let n = field ? 1 + (hash2(tx, ty, 71) < 0.5 ? 1 : 0) : dens > 0.62 ? 3 : dens > 0.45 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const h = hash2(tx * 3 + k, ty * 5 - k, 73);
    let id;
    if (field) id = [4, 5, 9][(h * 3) | 0];                       // داخلِ کشت فقط سبزه
    else if (dens > 0.62 && h < 0.7) id = kind;                   // قلبِ لکه: گلِ غالب
    else id = [4, 5, 6, 7, 8, 9][(h * 6) | 0];
    const m = FLORA[id];
    const x = sx + 1 + ((hash2(tx, ty + k * 7, 74) * (14 - m[0].length)) | 0);
    const y = sy + 1 + ((hash2(tx + k * 7, ty, 75) * (14 - m.length)) | 0);
    blit(r, m, FP, x, y);
  }
}
